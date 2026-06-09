import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from './entities/queue.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { QueueQueryDto } from './dto/queue-query.dto';
import { AppointmentsService } from '../appointments/appointments.service';
import { ActiveUserData } from '../utils';
import { QueueStatus } from './enums/queue-status.enum';
import { Payment } from '../payments/entities/payment.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { PaymentStatus } from '../payments/enums/payment-status.enum';

@Injectable()
export class QueuesService {
  constructor(
    @InjectRepository(Queue)
    private readonly queueRepository: Repository<Queue>,

    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,

    @InjectRepository(Clinic)
    private readonly clinicRepository: Repository<Clinic>,

    @InjectRepository(DoctorProfile)
    private readonly doctorRepository: Repository<DoctorProfile>,

    @Inject(forwardRef(() => AppointmentsService))
    private readonly appointmentsService: AppointmentsService,

    private readonly dataSource: DataSource,

    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,

    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) { }

 async createQueueEntry(
    appointmentId: number,
    currentUser: ActiveUserData,
  ): Promise<Queue> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId },
      relations: { patient: true, doctor: true, clinic: true },
    });

    if (!appointment) {
      throw new NotFoundException('The specified appointment does not exist.');
    }

    if (appointment.status !== 'confirmed') {
      throw new BadRequestException(
        `Cannot check-in patient. Appointment status is currently ${appointment.status}, but must be confirmed.`,
      );
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const appointmentTime = new Date(appointment.requestedDate);
    const appointmentDateStr = appointmentTime.toISOString().slice(0, 10);

    if (todayStr !== appointmentDateStr) {
      throw new BadRequestException(
        'Check-in can only be performed on the actual date of the appointment.',
      );
    }

    const ONE_HOUR_IN_MS = 60 * 60 * 1000;
    const allowedCheckinStartTime = new Date(appointmentTime.getTime() - ONE_HOUR_IN_MS);

    if (now < allowedCheckinStartTime) {
      throw new BadRequestException(
        'لا يمكن تفعيل الدور حالياً. يُسمح بعمل Check-in فقط قبل موعد الحجز الفعلي بساعة واحدة كحد أقصى.',
      );
    }

    const existingQueue = await this.queueRepository.findOne({
      where: { appointmentId },
    });
    if (existingQueue) {
      throw new BadRequestException(
        'This appointment has already been checked into the queue.',
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      const transactionalQueueRepo = manager.getRepository(Queue);
      const transactionalAppointmentRepo = manager.getRepository(Appointment);

      appointment.checkinTime = new Date();
      await transactionalAppointmentRepo.save(appointment);

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const maxPositionResult = await transactionalQueueRepo
        .createQueryBuilder('queue')
        .select('MAX(queue.position)', 'max')
        .where('queue.doctor_id = :doctorId', {
          doctorId: appointment.doctorId,
        })
        .andWhere('queue.clinic_id = :clinicId', {
          clinicId: appointment.clinicId,
        })
        .andWhere('queue.created_at BETWEEN :startOfToday AND :endOfToday', {
          startOfToday,
          endOfToday,
        })
        .getRawOne();

      const nextPosition =
        maxPositionResult && maxPositionResult.max
          ? Number(maxPositionResult.max) + 1
          : 1;

      const estimatedWaitMinutes = await this.calculateEstimatedWaitMinutes(
        appointment.clinicId,
        appointment.doctorId,
      );
      const isPriority = appointment.priority === '2';

      const queueEntry = transactionalQueueRepo.create({
        appointmentId: appointment.id,
        clinicId: appointment.clinicId,
        doctorId: appointment.doctorId,
        position: nextPosition,
        status: QueueStatus.WAITING,
        estimatedWaitMinutes,
        checkinTime: new Date(),
        isPriority,
      });
      return await transactionalQueueRepo.save(queueEntry);
    });
  }

  async getDoctorLiveQueue(doctorUserId: number): Promise<Queue[]> {
    const doctorProfile = await this.doctorRepository.findOne({
      where: { userId: doctorUserId },
    });

    if (!doctorProfile) {
      throw new NotFoundException('Doctor profile not found.');
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    return await this.queueRepository
      .createQueryBuilder('queue')
      .leftJoinAndSelect('queue.appointment', 'appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('patient.user', 'patientUser')
      .leftJoinAndSelect('queue.clinic', 'clinic')
      .where('queue.doctor_id = :doctorId', { doctorId: doctorProfile.id })
      .andWhere('queue.status IN (:...statuses)', {
        statuses: [QueueStatus.WAITING, QueueStatus.IN_PROGRESS],
      })
      .andWhere('queue.created_at BETWEEN :startOfToday AND :endOfToday', {
        startOfToday,
        endOfToday,
      })
      .orderBy('queue.position', 'ASC')
      .getMany();
  }
 async startConsultation(
    queueId: number,
    currentUser: ActiveUserData,
  ): Promise<Queue> {
    const doctorProfile = await this.doctorRepository.findOne({
      where: { userId: currentUser.sub },
    });
    if (!doctorProfile) {
      throw new NotFoundException('Doctor profile not found.');
    }

    const queue = await this.queueRepository.findOne({
      where: { id: queueId },
      relations: { appointment: true },
    });
    if (!queue) {
      throw new NotFoundException('Queue entry not found.');
    }

    if (Number(queue.doctorId) !== Number(doctorProfile.id)) {
      throw new ForbiddenException(
        'You do not have permission to start this consultation.',
      );
    }

    if (queue.status !== QueueStatus.CALLING) {
      throw new BadRequestException(
        'Consultation can only be started for patients in CALLING status.',
      );
    }

    const activeConsultation = await this.queueRepository.findOne({
      where: {
        doctorId: doctorProfile.id,
        status: QueueStatus.IN_PROGRESS,
      },
    });
    if (activeConsultation) {
      throw new BadRequestException(
        'You already have an active consultation. Please complete or skip it first.',
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      const transactionalQueueRepo = manager.getRepository(Queue);
      const transactionalAppointmentRepo = manager.getRepository(Appointment);

      const currentTime = new Date();

      queue.status = QueueStatus.IN_PROGRESS;
      queue.startedTime = currentTime;

      if (queue.appointment) {
        queue.appointment.actualStartTime = currentTime;
        await transactionalAppointmentRepo.save(queue.appointment);
      }

      return await transactionalQueueRepo.save(queue);
    });
  }
async callNextPatient(doctorUserId: number, clinicId: number): Promise<Queue> {
  const doctorProfile = await this.doctorRepository.findOne({
    where: { userId: doctorUserId },
  });

  if (!doctorProfile) {
    throw new NotFoundException('Doctor profile not found.');
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  // التأكد من عدم وجود مريض قيد المعاينة أو قيد الاستدعاء حالياً لنفس الدكتور والعيادة اليوم
  const activeSession = await this.queueRepository
    .createQueryBuilder('queue')
    .where('queue.doctorId = :doctorId', { doctorId: doctorProfile.id })
    .andWhere('queue.clinicId = :clinicId', { clinicId })
    .andWhere('queue.status IN (:...statuses)', { statuses: [QueueStatus.IN_PROGRESS, QueueStatus.CALLING] })
    .andWhere('CAST(queue.created_at AS DATE) = :today', { today: todayStr })
    .getOne();

  if (activeSession) {
    throw new BadRequestException(
      'لديك مريض داخل غرفة المعاينة أو قيد الاستدعاء حالياً، يرجى إنهاء الجلسة الحالية أولاً.',
    );
  }

  // جلب أول مريض في الانتظار (صاحب أقل رقم دور اليوم)
  const nextQueueEntry = await this.queueRepository
    .createQueryBuilder('queue')
    .where('queue.doctorId = :doctorId', { doctorId: doctorProfile.id })
    .andWhere('queue.clinicId = :clinicId', { clinicId })
    .andWhere('queue.status = :status', { status: QueueStatus.WAITING })
    .andWhere('CAST(queue.created_at AS DATE) = :today', { today: todayStr })
    .orderBy('queue.position', 'ASC')
    .getOne();

  if (!nextQueueEntry) {
    throw new NotFoundException('لا يوجد مرضى في قائمة الانتظار لهذا اليوم.');
  }

  // تحديث حالة الطابور إلى جاري الاستدعاء فقط
  nextQueueEntry.status = QueueStatus.CALLING;
  return await this.queueRepository.save(nextQueueEntry);
}
  
  async completeConsultation(
    queueId: number,
    currentUser: ActiveUserData,
  ): Promise<Queue> {
    // 1. جلب بروفايل الطبيب للأمان والتحقق من الصلاحيات
    const doctorProfile = await this.doctorRepository.findOne({
      where: { userId: currentUser.sub },
    });

    if (!doctorProfile) {
      throw new NotFoundException('Doctor profile not found.');
    }

    // 2. جلب سجل الطابور مع الموعد المرتبط به بناءً على الـ queueId
    const queue = await this.queueRepository.findOne({
      where: { id: queueId },
      relations: { appointment: true },
    });

    if (!queue) {
      throw new NotFoundException('Queue entry not found.');
    }

    // 3. التحقق من أن الطبيب الحالي هو نفسه المسؤول عن هذا المريض
    if (Number(queue.doctorId) !== Number(doctorProfile.id)) {
      throw new ForbiddenException(
        'You do not have permission to complete this consultation.',
      );
    }

    // 4. التأكد من أن المريض حالته حالياً قيد المعاينة (In Progress)
    if (queue.status !== QueueStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Consultation can only be completed if it is currently in progress.',
      );
    }

    // 5. حساب المدة المستغرقة بالدقائق ومعالجة الـ null في التواريخ بدقة
    const currentTime = new Date();
    // 6. حفظ التعديلات داخل Transaction آمن لضمان سلامة البيانات
    return await this.dataSource.transaction(async (manager) => {
      const transactionalQueueRepo = manager.getRepository(Queue);
      const transactionalAppointmentRepo = manager.getRepository(Appointment);
      const transactionalWalletRepo =
        manager.getRepository(Wallet);

      const transactionalPaymentRepo =
        manager.getRepository(Payment);
      // تحديث بيانات الطابور
      queue.status = QueueStatus.COMPLETED;
      queue.finishedTime = currentTime;

      // حل مشكلة الـ readonly عبر عمل Type Casting (queue as any) للإسناد المؤقت بـ TypeScript
      //(queue as any).consultationDurationMinutes = durationMinutes;

      // تحديث الموعد المرتبط تلقائياً ليكون متناسقاً مع الطابور
      if (queue.appointment) {
        queue.appointment.actualEndTime = currentTime;
        queue.appointment.status = QueueStatus.COMPLETED;
        await transactionalAppointmentRepo.save(queue.appointment);
      }
      if (queue.appointment) {

        const payment =
          await transactionalPaymentRepo.findOne({

            where: {
              appointmentId:
                queue.appointment.id,
            },

          });

        if (payment) {

          const wallet =
            await transactionalWalletRepo.findOne({

              where: {
                id: payment.walletId!,
              },

            });

          if (wallet) {

            wallet.frozenBalance =
              (
                Number(wallet.frozenBalance)
                -
                Number(payment.amount)
              ).toFixed(2);

            await transactionalWalletRepo.save(
              wallet,
            );

          }

          payment.status =
            PaymentStatus.COMPLETED;

          await transactionalPaymentRepo.save(
            payment,
          );

        }

      }
      return await transactionalQueueRepo.save(queue);
    });
  }

  async getLiveQueueForAdmin(query: QueueQueryDto): Promise<Queue[]> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const qb = this.queueRepository
      .createQueryBuilder('queue')
      .leftJoinAndSelect('queue.appointment', 'appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('patient.user', 'patientUser')
      .leftJoinAndSelect('queue.clinic', 'clinic')
      .where('queue.created_at BETWEEN :startOfToday AND :endOfToday', {
        startOfToday,
        endOfToday,
      });

    if (query.clinicId) {
      qb.andWhere('queue.clinicId = :clinicId', { clinicId: query.clinicId });
    }

    if (query.doctorId) {
      qb.andWhere('queue.doctorId = :doctorId', { doctorId: query.doctorId });
    }

    return await qb.orderBy('queue.position', 'ASC').getMany();
  }

async skipPatient(
  queueId: number,
  currentUser: ActiveUserData,
): Promise<Queue> {
  const queue = await this.queueRepository.findOne({
    where: { id: queueId },
  });

  if (!queue) {
    throw new NotFoundException('Queue entry not found.');
  }

  // التعديل هنا: السماح بالتجاوز فقط إذا كان المريض في الانتظار أو جاري استدعاؤه حالياً
  if (
    queue.status !== QueueStatus.WAITING &&
    queue.status !== QueueStatus.CALLING
  ) {
    throw new BadRequestException(
      'Cannot skip a patient who is not currently waiting or being called.',
    );
  }

  queue.status = QueueStatus.SKIPPED;
  return await this.queueRepository.save(queue);
}
  async reorderQueue(queueId: number, newPosition: number): Promise<Queue> {
    const queue = await this.queueRepository.findOne({
      where: { id: queueId },
    });

    if (!queue) {
      throw new NotFoundException('Queue entry not found.');
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    return await this.dataSource.transaction(async (manager) => {
      const transactionalQueueRepo = manager.getRepository(Queue);

      await transactionalQueueRepo
        .createQueryBuilder('queue')
        .update(Queue)
        .set({ position: () => 'position + 1' })
        .where('doctorId = :doctorId', { doctorId: queue.doctorId })
        .andWhere('clinicId = :clinicId', { clinicId: queue.clinicId })
        .andWhere('position >= :newPosition', { newPosition })
        .andWhere('created_at BETWEEN :startOfToday AND :endOfToday', {
          startOfToday,
          endOfToday,
        })
        .execute();

      queue.position = newPosition;
      return await transactionalQueueRepo.save(queue);
    });
  }

  async getPatientLiveStatus(
    appointmentId: number,
    currentUser: ActiveUserData,
  ): Promise<any> {
    const queue = await this.queueRepository.findOne({
      where: { appointmentId },
    });

    if (!queue) {
      throw new NotFoundException(
        'The patient has not checked in for this appointment yet.',
      );
    }

    if (
      queue.status === QueueStatus.COMPLETED ||
      queue.status === QueueStatus.SKIPPED
    ) {
      return {
        status: queue.status,
        currentPosition: queue.position,
        patientsAhead: 0,
        estimatedWaitMinutes: 0,
      };
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const patientsAhead = await this.queueRepository
      .createQueryBuilder('queue')
      .where('queue.doctorId = :doctorId', { doctorId: queue.doctorId })
      .andWhere('queue.clinicId = :clinicId', { clinicId: queue.clinicId })
      .andWhere('queue.status = :status', { status: QueueStatus.WAITING })
      .andWhere('queue.position < :position', { position: queue.position })
      .andWhere('queue.created_at BETWEEN :startOfToday AND :endOfToday', {
        startOfToday,
        endOfToday,
      })
      .getCount();

    const estimatedWaitMinutes = patientsAhead * 15;

    return {
      status: queue.status,
      currentPosition: queue.position,
      patientsAhead,
      estimatedWaitMinutes,
    };
  }

  private async calculateEstimatedWaitMinutes(
    clinicId: number,
    doctorId: number,
  ): Promise<number> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const waitingPatientsCount = await this.queueRepository
      .createQueryBuilder('queue')
      .where('queue.clinicId = :clinicId', { clinicId })
      .andWhere('queue.doctorId = :doctorId', { doctorId })
      .andWhere('queue.status = :status', { status: QueueStatus.WAITING })
      .andWhere('queue.created_at BETWEEN :startOfToday AND :endOfToday', {
        startOfToday,
        endOfToday,
      })
      .getCount();

    return waitingPatientsCount * 15;
  }
}
