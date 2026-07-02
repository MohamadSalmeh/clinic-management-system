import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
import { SystemSettingsService } from '../system-setting/system-settings.service';
import { SystemSetting } from '../system-setting/entities/system-setting.entity';
import {
  AppointmentCompletedEvent,
  QueueConsultationCompletedEvent,
  QueuePatientCalledEvent,
  QueuePatientSkippedEvent,
} from '../notifications/events';
import {
  nowDate,
  toDateString,
  startOfDay,
  endOfDay,
  addMinutes,
  minutesDiff,
} from '../common/utils/date-utils';

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

    @InjectRepository(SystemSetting)
    private readonly systemSettingRepository: Repository<SystemSetting>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============================================================
  // 1️⃣ createQueueEntry() - المعدلة
  // ============================================================
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

    const now = nowDate();
    const todayStr = toDateString(now);

    const appointmentTime = new Date(appointment.requestedDate);
    const appointmentDateStr = toDateString(appointmentTime);

    if (todayStr !== appointmentDateStr) {
      throw new BadRequestException(
        'Check-in can only be performed on the actual date of the appointment.',
      );
    }

    const settings = await this.systemSettingRepository.findOne({
      where: { id: 1 },
    });

    const totalDelay = await this.calculateTotalDelayForDoctor(
      appointment.doctorId,
      appointment.clinicId,
    );

    const MAX_CHECKIN_HOURS = settings?.checkinBeforeHours ?? 1;
    const maxCheckinMinutes = MAX_CHECKIN_HOURS * 60 + totalDelay;

    const allowedCheckinStartTime = addMinutes(
      appointmentTime,
      -maxCheckinMinutes,
    );

    if (now < allowedCheckinStartTime) {
      const hours = Math.floor(maxCheckinMinutes / 60);
      const minutes = maxCheckinMinutes % 60;
      const timeText =
        hours > 0 ? `${hours} ساعة و ${minutes} دقيقة` : `${minutes} دقيقة`;

      throw new BadRequestException(
        `لا يمكن تفعيل الدور حالياً. يُسمح بعمل Check-in فقط قبل موعد الحجز الفعلي بـ ${timeText} كحد أقصى.`,
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

      appointment.checkinTime = nowDate();
      await transactionalAppointmentRepo.save(appointment);

      const startOfTodayDate = startOfDay(nowDate());
      const endOfTodayDate = endOfDay(nowDate());

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
          startOfToday: startOfTodayDate,
          endOfToday: endOfTodayDate,
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
        checkinTime: nowDate(),
        isPriority,
      });
      return await transactionalQueueRepo.save(queueEntry);
    });
  }

  // ============================================================
  // 2️⃣ getDoctorLiveQueue() - المعدلة
  // ============================================================
  async getDoctorLiveQueue(doctorUserId: number): Promise<Queue[]> {
    const doctorProfile = await this.doctorRepository.findOne({
      where: { userId: doctorUserId },
    });

    if (!doctorProfile) {
      throw new NotFoundException('Doctor profile not found.');
    }

    const startOfTodayDate = startOfDay(nowDate());
    const endOfTodayDate = endOfDay(nowDate());

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
        startOfToday: startOfTodayDate,
        endOfToday: endOfTodayDate,
      })
      .orderBy('queue.position', 'ASC')
      .getMany();
  }

  // ============================================================
  // 3️⃣ startConsultation() - المعدلة
  // ============================================================
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

      const currentTime = nowDate();

      queue.status = QueueStatus.IN_PROGRESS;
      queue.startedTime = currentTime;

      if (queue.appointment) {
        queue.appointment.actualStartTime = currentTime;
        await transactionalAppointmentRepo.save(queue.appointment);
      }

      return await transactionalQueueRepo.save(queue);
    });
  }

  // ============================================================
  // 4️⃣ callNextPatient() - المعدلة
  // ============================================================
  async callNextPatient(
    doctorUserId: number,
    clinicId: number,
  ): Promise<Queue> {
    const doctorProfile = await this.doctorRepository.findOne({
      where: { userId: doctorUserId },
    });

    if (!doctorProfile) {
      throw new NotFoundException('Doctor profile not found.');
    }

    const todayStr = toDateString(nowDate());

    const activeSession = await this.queueRepository
      .createQueryBuilder('queue')
      .where('queue.doctorId = :doctorId', { doctorId: doctorProfile.id })
      .andWhere('queue.clinicId = :clinicId', { clinicId })
      .andWhere('queue.status IN (:...statuses)', {
        statuses: [QueueStatus.IN_PROGRESS, QueueStatus.CALLING],
      })
      .andWhere('CAST(queue.created_at AS DATE) = :today', { today: todayStr })
      .getOne();

    if (activeSession) {
      throw new BadRequestException(
        'لديك مريض داخل غرفة المعاينة أو قيد الاستدعاء حالياً، يرجى إنهاء الجلسة الحالية أولاً.',
      );
    }

    const nextQueueEntry = await this.queueRepository
      .createQueryBuilder('queue')
      .leftJoinAndSelect('queue.appointment', 'appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('queue.clinic', 'clinic')
      .where('queue.doctorId = :doctorId', { doctorId: doctorProfile.id })
      .andWhere('queue.clinicId = :clinicId', { clinicId })
      .andWhere('queue.status = :status', { status: QueueStatus.WAITING })
      .andWhere('CAST(queue.created_at AS DATE) = :today', { today: todayStr })
      .orderBy('queue.position', 'ASC')
      .getOne();

    if (!nextQueueEntry) {
      throw new NotFoundException('لا يوجد مرضى في قائمة الانتظار لهذا اليوم.');
    }

    nextQueueEntry.status = QueueStatus.CALLING;
    const updatedQueue = await this.queueRepository.save(nextQueueEntry);

    if (updatedQueue.appointment?.patient?.userId) {
      await this.eventEmitter.emitAsync(
        QueuePatientCalledEvent.eventName,
        new QueuePatientCalledEvent({
          userId: updatedQueue.appointment.patient.userId,
          appointmentId: updatedQueue.appointment.id,
          queueId: updatedQueue.id,
          clinicName: updatedQueue.clinic?.name ?? null,
        }),
      );
    }

    return updatedQueue;
  }

  // ============================================================
  // 5️⃣ completeConsultation() - المعدلة
  // ============================================================
  async completeConsultation(
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
      relations: { appointment: { patient: true }, clinic: true },
    });

    if (!queue) {
      throw new NotFoundException('Queue entry not found.');
    }

    if (Number(queue.doctorId) !== Number(doctorProfile.id)) {
      throw new ForbiddenException(
        'You do not have permission to complete this consultation.',
      );
    }

    if (queue.status !== QueueStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Consultation can only be completed if it is currently in progress.',
      );
    }

    const currentTime = nowDate();

    let actualDurationMinutes: number | null = null;
    if (queue.startedTime) {
      actualDurationMinutes = minutesDiff(currentTime, queue.startedTime);
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const transactionalQueueRepo = manager.getRepository(Queue);
      const transactionalAppointmentRepo = manager.getRepository(Appointment);
      const transactionalWalletRepo = manager.getRepository(Wallet);
      const transactionalPaymentRepo = manager.getRepository(Payment);

      queue.status = QueueStatus.COMPLETED;
      queue.finishedTime = currentTime;
      queue.actualDurationMinutes = actualDurationMinutes;

      if (queue.appointment) {
        queue.appointment.actualEndTime = currentTime;
        queue.appointment.status = QueueStatus.COMPLETED;
        await transactionalAppointmentRepo.save(queue.appointment);
      }

      if (queue.appointment) {
        const payment = await transactionalPaymentRepo.findOne({
          where: {
            appointmentId: queue.appointment.id,
          },
        });

        if (payment) {
          const wallet = await transactionalWalletRepo.findOne({
            where: {
              id: payment.walletId!,
            },
          });

          if (wallet) {
            wallet.frozenBalance = (
              Number(wallet.frozenBalance) - Number(payment.amount)
            ).toFixed(2);

            await transactionalWalletRepo.save(wallet);
          }

          payment.status = PaymentStatus.COMPLETED;
          await transactionalPaymentRepo.save(payment);
        }
      }

      await this.updateRemainingPatientsWaitTime(
        queue.doctorId,
        queue.clinicId,
        queue.appointment?.type,
        actualDurationMinutes,
      );

      return await transactionalQueueRepo.save(queue);
    });

    if (result.appointment?.patient?.userId) {
      await this.eventEmitter.emitAsync(
        AppointmentCompletedEvent.eventName,
        new AppointmentCompletedEvent({
          userId: result.appointment.patient.userId,
          appointmentId: result.appointment.id,
          queueId: result.id,
          clinicName: result.clinic?.name ?? null,
        }),
      );
    }

    return result;
  }

  // ============================================================
  // 6️⃣ getLiveQueueForAdmin() - المعدلة
  // ============================================================
  async getLiveQueueForAdmin(query: QueueQueryDto): Promise<Queue[]> {
    const startOfTodayDate = startOfDay(nowDate());
    const endOfTodayDate = endOfDay(nowDate());

    const qb = this.queueRepository
      .createQueryBuilder('queue')
      .leftJoinAndSelect('queue.appointment', 'appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('patient.user', 'patientUser')
      .leftJoinAndSelect('queue.clinic', 'clinic')
      .where('queue.created_at BETWEEN :startOfToday AND :endOfToday', {
        startOfToday: startOfTodayDate,
        endOfToday: endOfTodayDate,
      });

    if (query.clinicId) {
      qb.andWhere('queue.clinicId = :clinicId', { clinicId: query.clinicId });
    }

    if (query.doctorId) {
      qb.andWhere('queue.doctorId = :doctorId', { doctorId: query.doctorId });
    }

    return await qb.orderBy('queue.position', 'ASC').getMany();
  }

  // ============================================================
  // 7️⃣ skipPatient() - بدون تعديل (لا يستخدم تواريخ)
  // ============================================================
  async skipPatient(
    queueId: number,
    currentUser: ActiveUserData,
  ): Promise<Queue> {
    const queue = await this.queueRepository.findOne({
      where: { id: queueId },
      relations: { appointment: { patient: true }, clinic: true },
    });

    if (!queue) {
      throw new NotFoundException('Queue entry not found.');
    }

    if (
      queue.status !== QueueStatus.WAITING &&
      queue.status !== QueueStatus.CALLING
    ) {
      throw new BadRequestException(
        'Cannot skip a patient who is not currently waiting or being called.',
      );
    }

    queue.status = QueueStatus.SKIPPED;
    const updatedQueue = await this.queueRepository.save(queue);

    if (updatedQueue.appointment?.patient?.userId) {
      await this.eventEmitter.emitAsync(
        QueuePatientSkippedEvent.eventName,
        new QueuePatientSkippedEvent({
          userId: updatedQueue.appointment.patient.userId,
          appointmentId: updatedQueue.appointment.id,
          queueId: updatedQueue.id,
          clinicName: queue.clinic?.name ?? null,
        }),
      );
    }

    return updatedQueue;
  }

  // ============================================================
  // 8️⃣ reorderQueue() - المعدلة
  // ============================================================
  async reorderQueue(queueId: number, newPosition: number): Promise<Queue> {
    const queue = await this.queueRepository.findOne({
      where: { id: queueId },
    });

    if (!queue) {
      throw new NotFoundException('Queue entry not found.');
    }

    const startOfTodayDate = startOfDay(nowDate());
    const endOfTodayDate = endOfDay(nowDate());

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
          startOfToday: startOfTodayDate,
          endOfToday: endOfTodayDate,
        })
        .execute();

      queue.position = newPosition;
      return await transactionalQueueRepo.save(queue);
    });
  }

  // ============================================================
  // 9️⃣ getPatientLiveStatus() - المعدلة
  // ============================================================
  async getPatientLiveStatus(
    appointmentId: number,
    currentUser: ActiveUserData,
  ): Promise<any> {
    const queue = await this.queueRepository.findOne({
      where: { appointmentId },
      relations: ['appointment'],
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

    const startOfTodayDate = startOfDay(nowDate());
    const endOfTodayDate = endOfDay(nowDate());

    const patientsAhead = await this.queueRepository
      .createQueryBuilder('queue')
      .leftJoinAndSelect('queue.appointment', 'appointment')
      .where('queue.doctorId = :doctorId', { doctorId: queue.doctorId })
      .andWhere('queue.clinicId = :clinicId', { clinicId: queue.clinicId })
      .andWhere('queue.status = :status', { status: QueueStatus.WAITING })
      .andWhere('queue.position < :position', { position: queue.position })
      .andWhere('queue.created_at BETWEEN :startOfToday AND :endOfToday', {
        startOfToday: startOfTodayDate,
        endOfToday: endOfTodayDate,
      })
      .orderBy('queue.position', 'ASC')
      .getMany();

    const settings = await this.systemSettingRepository.findOne({
      where: { id: 1 },
    });

    let estimatedWaitMinutes = 0;
    for (const patient of patientsAhead) {
      const type = patient.appointment?.type;
      let duration = settings?.defaultDuration ?? 15;

      if (type === 'consultation') {
        duration = settings?.consultationDuration ?? 20;
      } else if (type === 'follow_up') {
        duration = settings?.followUpDuration ?? 10;
      } else if (type === 'operation') {
        duration = settings?.operationDuration ?? 45;
      }

      estimatedWaitMinutes += duration;
    }

    const currentConsultation = await this.queueRepository.findOne({
      where: {
        doctorId: queue.doctorId,
        status: QueueStatus.IN_PROGRESS,
      },
      relations: ['appointment'],
    });

    if (currentConsultation && currentConsultation.startedTime) {
      const now = nowDate();
      const elapsedMinutes = minutesDiff(now, currentConsultation.startedTime);

      const type = currentConsultation.appointment?.type;
      let expectedDuration = settings?.defaultDuration ?? 15;
      if (type === 'consultation') {
        expectedDuration = settings?.consultationDuration ?? 20;
      } else if (type === 'follow_up') {
        expectedDuration = settings?.followUpDuration ?? 10;
      } else if (type === 'operation') {
        expectedDuration = settings?.operationDuration ?? 45;
      }

      const remainingMinutes = Math.max(0, expectedDuration - elapsedMinutes);
      estimatedWaitMinutes += remainingMinutes;
    }

    return {
      status: queue.status,
      currentPosition: queue.position,
      patientsAhead: patientsAhead.length,
      estimatedWaitMinutes: Math.round(estimatedWaitMinutes),
    };
  }

  // ============================================================
  // 🔟 calculateEstimatedWaitMinutes() - المعدلة
  // ============================================================
  private async calculateEstimatedWaitMinutes(
    clinicId: number,
    doctorId: number,
  ): Promise<number> {
    const startOfTodayDate = startOfDay(nowDate());
    const endOfTodayDate = endOfDay(nowDate());

    const waitingPatients = await this.queueRepository
      .createQueryBuilder('queue')
      .leftJoinAndSelect('queue.appointment', 'appointment')
      .where('queue.clinicId = :clinicId', { clinicId })
      .andWhere('queue.doctorId = :doctorId', { doctorId })
      .andWhere('queue.status = :status', { status: QueueStatus.WAITING })
      .andWhere('queue.created_at BETWEEN :startOfToday AND :endOfToday', {
        startOfToday: startOfTodayDate,
        endOfToday: endOfTodayDate,
      })
      .getMany();

    const settings = await this.systemSettingRepository.findOne({
      where: { id: 1 },
    });

    let totalWaitMinutes = 0;

    for (const patient of waitingPatients) {
      const type = patient.appointment?.type;
      let duration = settings?.defaultDuration ?? 15;

      if (type === 'consultation') {
        duration = settings?.consultationDuration ?? 20;
      } else if (type === 'follow_up') {
        duration = settings?.followUpDuration ?? 10;
      } else if (type === 'operation') {
        duration = settings?.operationDuration ?? 45;
      }

      totalWaitMinutes += duration;
    }

    return totalWaitMinutes;
  }

  // ============================================================
  // 1️⃣1️⃣ updateRemainingPatientsWaitTime() - المعدلة
  // ============================================================
  private async updateRemainingPatientsWaitTime(
    doctorId: number,
    clinicId: number,
    appointmentType: string | undefined,
    actualDurationMinutes: number | null,
  ): Promise<void> {
    if (!actualDurationMinutes) {
      return;
    }

    const settings = await this.systemSettingRepository.findOne({
      where: { id: 1 },
    });

    let expectedDuration = settings?.defaultDuration ?? 15;
    if (appointmentType === 'consultation') {
      expectedDuration = settings?.consultationDuration ?? 20;
    } else if (appointmentType === 'follow_up') {
      expectedDuration = settings?.followUpDuration ?? 10;
    } else if (appointmentType === 'operation') {
      expectedDuration = settings?.operationDuration ?? 45;
    }

    const extraTime = actualDurationMinutes - expectedDuration;

    if (extraTime > 0) {
      const startOfTodayDate = startOfDay(nowDate());
      const endOfTodayDate = endOfDay(nowDate());

      const remainingPatients = await this.queueRepository
        .createQueryBuilder('queue')
        .where('queue.doctorId = :doctorId', { doctorId })
        .andWhere('queue.clinicId = :clinicId', { clinicId })
        .andWhere('queue.status = :status', { status: QueueStatus.WAITING })
        .andWhere('queue.created_at BETWEEN :startOfToday AND :endOfToday', {
          startOfToday: startOfTodayDate,
          endOfToday: endOfTodayDate,
        })
        .orderBy('queue.position', 'ASC')
        .getMany();

      for (const patient of remainingPatients) {
        patient.estimatedWaitMinutes =
          (patient.estimatedWaitMinutes || 0) + extraTime;
        await this.queueRepository.save(patient);
      }
    }
  }

  // ============================================================
  // 1️⃣2️⃣ calculateTotalDelayForDoctor() - المعدلة
  // ============================================================
  private async calculateTotalDelayForDoctor(
    doctorId: number,
    clinicId: number,
  ): Promise<number> {
    const startOfTodayDate = startOfDay(nowDate());
    const endOfTodayDate = endOfDay(nowDate());

    const completedPatients = await this.queueRepository
      .createQueryBuilder('queue')
      .leftJoinAndSelect('queue.appointment', 'appointment')
      .where('queue.doctorId = :doctorId', { doctorId })
      .andWhere('queue.clinicId = :clinicId', { clinicId })
      .andWhere('queue.status = :status', { status: QueueStatus.COMPLETED })
      .andWhere('queue.created_at BETWEEN :startOfToday AND :endOfToday', {
        startOfToday: startOfTodayDate,
        endOfToday: endOfTodayDate,
      })
      .getMany();

    const settings = await this.systemSettingRepository.findOne({
      where: { id: 1 },
    });

    let totalDelay = 0;

    for (const patient of completedPatients) {
      if (patient.actualDurationMinutes) {
        const type = patient.appointment?.type;
        let expectedDuration = settings?.defaultDuration ?? 15;

        if (type === 'consultation') {
          expectedDuration = settings?.consultationDuration ?? 20;
        } else if (type === 'follow_up') {
          expectedDuration = settings?.followUpDuration ?? 10;
        } else if (type === 'operation') {
          expectedDuration = settings?.operationDuration ?? 45;
        }

        const delay = Math.max(
          0,
          patient.actualDurationMinutes - expectedDuration,
        );
        totalDelay += delay;
      }
    }

    return totalDelay;
  }
}
