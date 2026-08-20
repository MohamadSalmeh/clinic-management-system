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
import { ActiveUserData, UserRole } from '../utils';
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
  combineDateAndTime,
} from '../common/utils/date-utils';
import { QueuePriorityGroup } from './enums/queue-priority-group.enum';
import { DoctorSchedule, DoctorScheduleType } from '../doctor-schedules/entities/doctor-schedule.entity';
import { QueueResponseDto } from './dto/queue-response.dto';
import { PatientProfile } from '../patients/entities/patient-profile.entity';

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

    @InjectRepository(DoctorSchedule)
    private readonly doctorScheduleRepository: Repository<DoctorSchedule>,
  ) { }
  async toQueueResponseDto(queue: Queue): Promise<QueueResponseDto> {
    const isTerminal =
      queue.status === QueueStatus.COMPLETED ||
      queue.status === QueueStatus.SKIPPED;

    let currentPosition: number | null = null;
    let patientsAhead: number | null = null;
    let expectedWaitingTimeMinutes: number | null = null;

    if (!isTerminal) {
      currentPosition =
        await this.calculateDynamicCurrentPosition(queue);

      patientsAhead =
        currentPosition === null
          ? null
          : Math.max(currentPosition - 1, 0);

      expectedWaitingTimeMinutes =
        currentPosition === null
          ? null
          : await this.calculateDynamicEstimatedWaitMinutes(queue);
    }

    const response = new QueueResponseDto();

    response.id = queue.id;
    response.appointmentId = queue.appointmentId;
    response.clinicId = queue.clinicId;
    response.doctorId = queue.doctorId;

    response.currentPosition = currentPosition;
    response.patientsAhead = patientsAhead;

    response.priorityGroup = queue.priorityGroup;
    response.status = queue.status;

    response.checkInAt = queue.checkinTime;
    response.calledAt = queue.calledAt;
    response.consultationStartedAt = queue.startedTime;
    response.completedAt = queue.finishedTime;
    response.skippedAt = queue.skippedAt;

    response.expectedWaitingTimeMinutes =
      expectedWaitingTimeMinutes;

    response.patientDelayMinutes =
      this.calculatePatientQueueDelay(queue);

    response.actualConsultationDurationMinutes =
      queue.status === QueueStatus.COMPLETED
        ? queue.actualDurationMinutes
        : null;

    response.clinic = queue.clinic;
    response.doctor = queue.doctor;
    response.appointment = queue.appointment;

    return response;
  }
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

    const appointmentTime = combineDateAndTime(
      typeof appointment.requestedDate === 'string'
        ? appointment.requestedDate
        : toDateString(appointment.requestedDate),
      appointment.startTime,
    );
    const appointmentDateStr = toDateString(appointmentTime);
    if (todayStr !== appointmentDateStr) {
      throw new BadRequestException(
        'Check-in can only be performed on the actual date of the appointment.',
      );
    }

    const settings = await this.systemSettingRepository.findOne({
      where: { id: 1 },
    });

    /*const totalDelay = await this.calculateTotalDelayForDoctor(
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
*/
    const minimumCheckinTime = addMinutes(appointmentTime, -60);

    if (now < minimumCheckinTime) {
      throw new BadRequestException(
        'لا يمكن عمل Check-in قبل ساعة واحدة من موعد الحجز.',
      );
    }
    const doctorDelay = await this.calculateTotalDelayForDoctor(
      appointment.doctorId,
      appointment.clinicId,
    );

    const normalCheckinDeadline = addMinutes(
      appointmentTime,
      doctorDelay,
    );

    const priorityGroup =
      now <= normalCheckinDeadline
        ? QueuePriorityGroup.NORMAL
        : QueuePriorityGroup.LATE;
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

      /*const startOfTodayDate = startOfDay(nowDate());
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
*/
      /*const estimatedWaitMinutes = await this.calculateEstimatedWaitMinutes(
        appointment.clinicId,
        appointment.doctorId,
      );*/
      //const isPriority = appointment.priority === '2';

      /*const queueEntry = transactionalQueueRepo.create({
        appointmentId: appointment.id,
        clinicId: appointment.clinicId,
        doctorId: appointment.doctorId,
        position: nextPosition,
        status: QueueStatus.WAITING,
        estimatedWaitMinutes,
        checkinTime: nowDate(),
        isPriority,
      });
      */
      const queueEntry = transactionalQueueRepo.create({
        appointmentId: appointment.id,
        clinicId: appointment.clinicId,
        doctorId: appointment.doctorId,
        status: QueueStatus.WAITING,
        checkinTime: nowDate(),
        priorityGroup,
      });
      return await transactionalQueueRepo.save(queueEntry);
    });
  }
  private async getTodayDoctorSchedule(
    doctorProfileId: number,
    clinicId: number,
    date: Date,
  ): Promise<DoctorSchedule | null> {
    const schedules = await this.doctorScheduleRepository.find({
      where: {
        doctorProfileId,
        clinicId,
        dayOfWeek: date.getDay(),
        isActive: true,
      },
      order: {
        startTime: 'ASC',
      },
    });

    return (
      schedules.find(
        (schedule) => schedule.type === DoctorScheduleType.NORMAL,
      ) ?? null
    );
  }
  private async calculateInitialOpeningDelay(
    doctorProfileId: number,
    clinicId: number,
    date: Date,
  ): Promise<number> {
    const schedule = await this.getTodayDoctorSchedule(
      doctorProfileId,
      clinicId,
      date,
    );

    if (!schedule) {
      return 0;
    }

    const scheduleStart = combineDateAndTime(
      toDateString(date),
      schedule.startTime,
    );

    const consultations = await this.queueRepository
      .createQueryBuilder('queue')
      .leftJoinAndSelect('queue.appointment', 'appointment')
      .where('queue.doctorId = :doctorId', {
        doctorId: doctorProfileId,
      })
      .andWhere('queue.clinicId = :clinicId', {
        clinicId,
      })
      .andWhere('queue.status IN (:...statuses)', {
        statuses: [
          QueueStatus.IN_PROGRESS,
          QueueStatus.COMPLETED,
        ],
      })
      .andWhere('queue.created_at BETWEEN :start AND :end', {
        start: startOfDay(date),
        end: endOfDay(date),
      })
      .andWhere('queue.started_time IS NOT NULL')
      .orderBy('queue.started_time', 'ASC')
      .getMany();

    const firstConsultation = consultations.find((queue) => {
      if (!queue.appointment?.requestedDate) {
        return false;
      }

      return (
        toDateString(queue.appointment.requestedDate) ===
        toDateString(date)
      );
    });

    if (!firstConsultation?.startedTime) {
      return 0;
    }

    return Math.max(
      minutesDiff(firstConsultation.startedTime, scheduleStart),
      0,
    );
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

    const today = toDateString(nowDate());

    const queues = await this.queueRepository
      .createQueryBuilder('queue')
      .leftJoinAndSelect('queue.appointment', 'appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('patient.user', 'patientUser')
      .leftJoinAndSelect('queue.clinic', 'clinic')
      .where('queue.doctor_id = :doctorId', {
        doctorId: doctorProfile.id,
      })
      .andWhere('appointment.requested_date = :today', {
        today,
      })
      .andWhere('queue.status IN (:...statuses)', {
        statuses: [
          QueueStatus.WAITING,
          QueueStatus.CALLING,
          QueueStatus.IN_PROGRESS,
        ],
      })
      .getMany();

    /*const queues = await this.queueRepository
      .createQueryBuilder('queue')
      .leftJoinAndSelect('queue.appointment', 'appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .andWhere(
        `appointment.requestedDate = :scheduledDate`,
        {
          scheduledDate: toDateString(nowDate()),
        },
      )
      .leftJoinAndSelect('patient.user', 'patientUser')
      .leftJoinAndSelect('queue.clinic', 'clinic')
      .where('queue.doctor_id = :doctorId', { doctorId: doctorProfile.id })
      .andWhere('queue.status IN (:...statuses)', {
        statuses: [
          QueueStatus.WAITING,
          QueueStatus.CALLING,
          QueueStatus.IN_PROGRESS,
        ],
      })
      .getMany();*/

    const orderedQueues = this.sortQueueEntries(queues);



    return orderedQueues;
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

    const result = await this.dataSource.transaction(async (manager) => {
      const transactionalQueueRepo = manager.getRepository(Queue);
      const transactionalAppointmentRepo =
        manager.getRepository(Appointment);

      const queue = await transactionalQueueRepo
        .createQueryBuilder('queue')
        .setLock('pessimistic_write')
        .where('queue.id = :queueId', { queueId })
        .getOne();

      if (!queue) {
        throw new NotFoundException('Queue entry not found.');
      }
      const appointment = await transactionalAppointmentRepo.findOne({
        where: { id: queue.appointmentId },
      });
      if (!appointment) {
        throw new NotFoundException('Appointment not found.');
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

      const activeConsultation = await transactionalQueueRepo.findOne({
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

      const currentTime = nowDate();

      queue.status = QueueStatus.IN_PROGRESS;
      queue.startedTime = currentTime;

      appointment.actualStartTime = currentTime;
      await transactionalAppointmentRepo.save(appointment);

      return transactionalQueueRepo.save(queue);
    });
    const updatedQueue = await this.queueRepository.findOne({
      where: { id: result.id },
      relations: {
        appointment: true,
        clinic: true,
        doctor: true,
      },
    });

    if (!updatedQueue) {
      throw new NotFoundException('Queue entry not found after update.');
    }

    return updatedQueue;

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

    const updatedQueue = await this.dataSource.transaction(async (manager) => {
      const transactionalQueueRepo = manager.getRepository(Queue);

      // Lock any current active session for this doctor/clinic.
      const activeSession = await transactionalQueueRepo
        .createQueryBuilder('queue')
        .setLock('pessimistic_write')
        .where('queue.doctor_id = :doctorId', {
          doctorId: doctorProfile.id,
        })
        .andWhere('queue.clinic_id = :clinicId', {
          clinicId,
        })
        .andWhere('queue.status IN (:...statuses)', {
          statuses: [
            QueueStatus.IN_PROGRESS,
            QueueStatus.CALLING,
          ],
        })
        .andWhere('CAST(queue.created_at AS DATE) = :today', {
          today: toDateString(nowDate()),
        })
        .getOne();

      if (activeSession) {
        throw new BadRequestException(
          'لديك مريض داخل غرفة المعاينة أو قيد الاستدعاء حالياً، يرجى إنهاء الجلسة الحالية أولاً.',
        );
      }

      // Get all waiting patients in the lane.
      const waitingQueues = await transactionalQueueRepo
        .createQueryBuilder('queue')
        .leftJoinAndSelect('queue.appointment', 'appointment')
        .leftJoinAndSelect('appointment.patient', 'patient')
        .leftJoinAndSelect('queue.clinic', 'clinic')
        .where('queue.doctor_id = :doctorId', {
          doctorId: doctorProfile.id,
        })
        .andWhere('queue.clinic_id = :clinicId', {
          clinicId,
        })
        .andWhere('queue.status = :status', {
          status: QueueStatus.WAITING,
        })
        .andWhere('CAST(queue.created_at AS DATE) = :today', {
          today: toDateString(nowDate()),
        })
        .getMany();

      const orderedWaitingQueues = this.sortQueueEntries(waitingQueues);

      const nextQueueEntry = orderedWaitingQueues[0];

      if (!nextQueueEntry) {
        throw new NotFoundException(
          'لا يوجد مرضى في قائمة الانتظار لهذا اليوم.',
        );
      }

      // Lock the selected patient row before changing its state.
      await transactionalQueueRepo
        .createQueryBuilder()
        .update(Queue)
        .set({
          status: QueueStatus.CALLING,
          calledAt: nowDate(),
        })
        .where('id = :id', { id: nextQueueEntry.id })
        .execute();

      const result = await transactionalQueueRepo
        .createQueryBuilder('queue')
        .leftJoinAndSelect('queue.appointment', 'appointment')
        .leftJoinAndSelect('appointment.patient', 'patient')
        .leftJoinAndSelect('queue.clinic', 'clinic')
        .where('queue.id = :id', {
          id: nextQueueEntry.id,
        })
        .getOne();

      if (!result) {
        throw new NotFoundException('Queue entry not found after calling.');
      }

      return result;
    });

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

      /*await this.updateRemainingPatientsWaitTime(
        queue.doctorId,
        queue.clinicId,
        queue.appointment?.type,
        actualDurationMinutes,
      );*/

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
    const today = toDateString(nowDate());

    const qb = this.queueRepository
      .createQueryBuilder('queue')
      .leftJoinAndSelect('queue.appointment', 'appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('patient.user', 'patientUser')
      .leftJoinAndSelect('queue.clinic', 'clinic')
      .leftJoinAndSelect('queue.doctor', 'doctor')
      .where('appointment.requested_date = :today', {
        today,
      })
      .andWhere('queue.status IN (:...statuses)', {
        statuses: [
          QueueStatus.WAITING,
          QueueStatus.CALLING,
          QueueStatus.IN_PROGRESS,
        ],
      });

    if (query.clinicId) {
      qb.andWhere('queue.clinic_id = :clinicId', {
        clinicId: query.clinicId,
      });
    }

    if (query.doctorId) {
      qb.andWhere('queue.doctor_id = :doctorId', {
        doctorId: query.doctorId,
      });
    }

    const queues = await qb.getMany();

    const orderedQueues = this.sortQueueEntries(queues);



    return orderedQueues;
  }
  // ============================================================
  // 7️⃣ skipPatient() - بدون تعديل (لا يستخدم تواريخ)
  // ============================================================
  async skipPatient(
    queueId: number,
    currentUser: ActiveUserData,
  ): Promise<Queue> {
    const updatedQueue = await this.dataSource.transaction(async (manager) => {
      const transactionalQueueRepo = manager.getRepository(Queue);
      const transactionalAppointmentRepo =
        manager.getRepository(Appointment);
      const transactionalPatientRepo =
        manager.getRepository(PatientProfile);
      const transactionalClinicRepo =
        manager.getRepository(Clinic);

      // 1. Lock Queue row only
      const queue = await transactionalQueueRepo
        .createQueryBuilder('queue')
        .setLock('pessimistic_write')
        .where('queue.id = :queueId', { queueId })
        .getOne();

      if (!queue) {
        throw new NotFoundException('Queue entry not found.');
      }

      // 2. Doctor ownership check
      if (currentUser.usertype?.toLowerCase() === UserRole.DOCTOR) {
        const doctorProfile = await this.doctorRepository.findOne({
          where: { userId: currentUser.sub },
        });

        if (!doctorProfile) {
          throw new NotFoundException('Doctor profile not found.');
        }

        if (Number(queue.doctorId) !== Number(doctorProfile.id)) {
          throw new ForbiddenException(
            'You do not have permission to skip this queue entry.',
          );
        }
      }

      // 3. Only CALLING can be skipped
      if (queue.status !== QueueStatus.CALLING) {
        throw new BadRequestException(
          'Only a patient in CALLING status can be skipped.',
        );
      }

      // 4. Update lifecycle
      queue.status = QueueStatus.SKIPPED;
      queue.skippedAt = nowDate();

      await transactionalQueueRepo.save(queue);

      // 5. Load required relations after the lock
      const appointment = await transactionalAppointmentRepo.findOne({
        where: { id: queue.appointmentId },
      });

      if (!appointment) {
        throw new NotFoundException('Appointment not found.');
      }

      const patient = await transactionalPatientRepo.findOne({
        where: { id: appointment.patientId },
      });

      const clinic = await transactionalClinicRepo.findOne({
        where: { id: queue.clinicId },
      });

      queue.appointment = appointment;
      queue.appointment.patient = patient!;
      queue.clinic = clinic!;

      return queue;
    });

    if (updatedQueue.appointment?.patient?.userId) {
      await this.eventEmitter.emitAsync(
        QueuePatientSkippedEvent.eventName,
        new QueuePatientSkippedEvent({
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
  // 8️⃣ reorderQueue() - المعدلة
  // ============================================================


  // ============================================================
  // 9️⃣ getPatientLiveStatus() - المعدلة
  // ============================================================
  private calculatePatientQueueDelay(queue: Queue): number | null {
    if (!queue.appointment?.requestedDate) {
      return null;
    }

    if (
      queue.status !== QueueStatus.WAITING &&
      queue.status !== QueueStatus.CALLING
    ) {
      return null;
    }

    const scheduled = combineDateAndTime(
      toDateString(queue.appointment.requestedDate),
      queue.appointment.startTime,
    );

    return Math.max(
      0,
      Math.floor(
        (nowDate().getTime() - scheduled.getTime()) / 60000,
      ),
    );
  }
  private async calculateDynamicCurrentPosition(
    queue: Queue,
  ): Promise<number | null> {
    const today = toDateString(nowDate());

    const activeQueues = await this.queueRepository
      .createQueryBuilder('queue')
      .leftJoinAndSelect('queue.appointment', 'appointment')
      .where('queue.doctor_id = :doctorId', {
        doctorId: queue.doctorId,
      })
      .andWhere('queue.clinic_id = :clinicId', {
        clinicId: queue.clinicId,
      })
      .andWhere('appointment.requested_date = :today', {
        today,
      })
      .andWhere('queue.status IN (:...statuses)', {
        statuses: [
          QueueStatus.WAITING,
          QueueStatus.CALLING,
          QueueStatus.IN_PROGRESS,
        ],
      })
      .getMany();

    const orderedQueues = this.sortQueueEntries(activeQueues);

    const index = orderedQueues.findIndex(
      (item) => item.id === queue.id,
    );

    return index === -1 ? null : index + 1;
  }

  async getPatientActiveQueue(
    currentUser: ActiveUserData,
  ): Promise<Queue | null> {
    const start = startOfDay(nowDate());
    const end = endOfDay(nowDate());

    const queue = await this.queueRepository
      .createQueryBuilder('queue')
      .leftJoinAndSelect('queue.appointment', 'appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('patient.user', 'patientUser')
      .leftJoinAndSelect('queue.doctor', 'doctor')
      .leftJoinAndSelect('doctor.user', 'doctorUser')
      .leftJoinAndSelect('queue.clinic', 'clinic')
      .where('patient.userId = :userId', { userId: currentUser.sub })
      .andWhere('queue.status IN (:...statuses)', {
        statuses: [
          QueueStatus.WAITING,
          QueueStatus.CALLING,
          QueueStatus.IN_PROGRESS,
        ],
      })
      .andWhere('queue.checkinTime BETWEEN :start AND :end', {
        start,
        end,
      })
      .orderBy('queue.checkinTime', 'DESC')
      .getOne();

    if (!queue) {
      return null;
    }

    return queue;
  }
  private async resolveAppointmentDuration(
    appointmentType: string | undefined,
  ): Promise<number> {
    const settings = await this.systemSettingRepository.findOne({
      where: { id: 1 },
    });

    const normalizedType = appointmentType
      ?.trim()
      .toLowerCase()
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ');

    switch (normalizedType) {
      case 'initial visit':
        return settings?.initialVisitDuration ?? 30;

      case 'return visit':
        return settings?.returnVisitDuration ?? 20;

      case 'consultation':
        return settings?.consultationDuration ?? 20;

      case 'follow up':
        return settings?.followUpDuration ?? 10;

      case 'operation':
        return settings?.operationDuration ?? 45;

      default:
        throw new BadRequestException(
          `Unsupported appointment type: ${appointmentType ?? 'undefined'}`,
        );
    }
  }
  private async calculateDynamicEstimatedWaitMinutes(
    queue: Queue,
  ): Promise<number> {
    const today = toDateString(nowDate());

    const activeQueues = await this.queueRepository
      .createQueryBuilder('queue')
      .leftJoinAndSelect('queue.appointment', 'appointment')
      .where('queue.doctor_id = :doctorId', {
        doctorId: queue.doctorId,
      })
      .andWhere('queue.clinic_id = :clinicId', {
        clinicId: queue.clinicId,
      })
      .andWhere('appointment.requested_date = :today', {
        today,
      })
      .andWhere('queue.status IN (:...statuses)', {
        statuses: [
          QueueStatus.WAITING,
          QueueStatus.CALLING,
          QueueStatus.IN_PROGRESS,
        ],
      })
      .getMany();

    const orderedQueues = this.sortQueueEntries(activeQueues);

    const currentIndex = orderedQueues.findIndex(
      (item) => item.id === queue.id,
    );

    if (currentIndex <= 0) {
      return 0;
    }

    let estimatedWaitMinutes = 0;

    for (let index = 0; index < currentIndex; index++) {
      const predecessor = orderedQueues[index];

      if (
        predecessor.status === QueueStatus.IN_PROGRESS &&
        predecessor.startedTime
      ) {
        const expectedDuration =
          await this.resolveAppointmentDuration(
            predecessor.appointment?.type,
          );

        const elapsedMinutes = minutesDiff(
          nowDate(),
          predecessor.startedTime,
        );

        estimatedWaitMinutes += Math.max(
          expectedDuration - elapsedMinutes,
          0,
        );

        continue;
      }

      const duration = await this.resolveAppointmentDuration(
        predecessor.appointment?.type,
      );

      estimatedWaitMinutes += duration;
    }

    return Math.max(
      Math.round(estimatedWaitMinutes),
      0,
    );
  }
  async getPatientLiveStatus(
    appointmentId: number,
    currentUser: ActiveUserData,
  ): Promise<Queue> {
    const queue = await this.queueRepository.findOne({
      where: { appointmentId },
      relations: {
        appointment: {
          patient: true,
        },
      },
    });

    if (!queue) {
      throw new NotFoundException(
        'The patient has not checked in for this appointment yet.',
      );
    }

    if (
      Number(queue.appointment.patient?.userId) !==
      Number(currentUser.sub)
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this queue.',
      );
    }

    return queue;
  }

  // ============================================================
  // 🔟 calculateEstimatedWaitMinutes() - المعدلة
  // ============================================================


  // ============================================================
  // 1️⃣1️⃣ updateRemainingPatientsWaitTime() - المعدلة
  // ============================================================


  // ============================================================
  // 1️⃣2️⃣ calculateTotalDelayForDoctor() - المعدلة
  // ============================================================
  private async calculateTotalDelayForDoctor(
    doctorId: number,
    clinicId: number,
  ): Promise<number> {
    const startOfTodayDate = startOfDay(nowDate());
    const endOfTodayDate = endOfDay(nowDate());
    const initialOpeningDelay = await this.calculateInitialOpeningDelay(
      doctorId,
      clinicId,
      nowDate(),
    );
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
      .andWhere('queue.finished_time IS NOT NULL')
      .andWhere('queue.finished_time <= :now', {
        now: nowDate(),
      })
      .getMany();

    const settings = await this.systemSettingRepository.findOne({
      where: { id: 1 },
    });

    let totalDelay = 0;

    for (const patient of completedPatients) {
      if (patient.actualDurationMinutes) {
        const expectedDuration = await this.resolveAppointmentDuration(
          patient.appointment?.type,
        );

        const delay = Math.max(
          0,
          patient.actualDurationMinutes - expectedDuration,
        );
        totalDelay += delay;
      }
    }

    return initialOpeningDelay + totalDelay;;
  }
  private sortQueueEntries(queues: Queue[]): Queue[] {
    return queues.sort((a, b) => {
      // IN_PROGRESS أولاً
      if (
        a.status === QueueStatus.IN_PROGRESS &&
        b.status !== QueueStatus.IN_PROGRESS
      ) {
        return -1;
      }

      if (
        b.status === QueueStatus.IN_PROGRESS &&
        a.status !== QueueStatus.IN_PROGRESS
      ) {
        return 1;
      }

      // CALLING بعد IN_PROGRESS
      if (
        a.status === QueueStatus.CALLING &&
        b.status !== QueueStatus.CALLING
      ) {
        return -1;
      }

      if (
        b.status === QueueStatus.CALLING &&
        a.status !== QueueStatus.CALLING
      ) {
        return 1;
      }

      // NORMAL قبل LATE
      if (a.priorityGroup !== b.priorityGroup) {
        return a.priorityGroup === QueuePriorityGroup.NORMAL ? -1 : 1;
      }

      // NORMAL: حسب موعد الحجز ثم check-in ثم id
      if (a.priorityGroup === QueuePriorityGroup.NORMAL) {
        const aAppointmentTime = a.appointment
          ? combineDateAndTime(
            typeof a.appointment.requestedDate === 'string'
              ? a.appointment.requestedDate
              : toDateString(a.appointment.requestedDate),
            a.appointment.startTime,
          ).getTime()
          : Number.MAX_SAFE_INTEGER;

        const bAppointmentTime = b.appointment
          ? combineDateAndTime(
            typeof b.appointment.requestedDate === 'string'
              ? b.appointment.requestedDate
              : toDateString(b.appointment.requestedDate),
            b.appointment.startTime,
          ).getTime()
          : Number.MAX_SAFE_INTEGER;

        if (aAppointmentTime !== bAppointmentTime) {
          return aAppointmentTime - bAppointmentTime;
        }
      }

      // LATE أو عند تساوي موعد NORMAL:
      // check-in ثم id
      const aCheckin = a.checkinTime?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bCheckin = b.checkinTime?.getTime() ?? Number.MAX_SAFE_INTEGER;

      if (aCheckin !== bCheckin) {
        return aCheckin - bCheckin;
      }

      return a.id - b.id;
    });
  }
  // ============================================================
  // تحديد المريض التالي ضمن قائمة مرتبة (يُستدعى بعد أي getMany على الطابور)
  // ============================================================

  // ============================================================
  // getQueueMetrics() - إحصائيات حية للطابور
  // ============================================================
  async getQueueMetrics(query: QueueQueryDto): Promise<{
    totalCheckedIn: number;
    completedCount: number;
    waitingCount: number;
    avgConsultationTime: number;
    avgWaitTime: number;
  }> {
    const startOfTodayDate = startOfDay(nowDate());
    const endOfTodayDate = endOfDay(nowDate());

    const baseQb = () => {
      const qb = this.queueRepository
        .createQueryBuilder('queue')
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
      return qb;
    };

    const totalCheckedIn = await baseQb().getCount();

    const completedCount = await baseQb()
      .andWhere('queue.status = :status', { status: QueueStatus.COMPLETED })
      .getCount();

    const waitingCount = await baseQb()
      .andWhere('queue.status = :status', { status: QueueStatus.WAITING })
      .getCount();

    const avgConsultationRaw = await baseQb()
      .andWhere('queue.status = :status', { status: QueueStatus.COMPLETED })
      .andWhere('queue.actual_duration_minutes IS NOT NULL')
      .select('AVG(queue.actual_duration_minutes)', 'avg')
      .getRawOne();

    const avgWaitRaw = await baseQb()
      .andWhere('queue.started_time IS NOT NULL')
      .andWhere('queue.checkin_time IS NOT NULL')
      .select(
        'AVG(EXTRACT(EPOCH FROM (queue.started_time - queue.checkin_time)) / 60)',
        'avg',
      )
      .getRawOne();

    return {
      totalCheckedIn,
      completedCount,
      waitingCount,
      avgConsultationTime: avgConsultationRaw?.avg
        ? Math.round(Number(avgConsultationRaw.avg))
        : 0,
      avgWaitTime: avgWaitRaw?.avg ? Math.round(Number(avgWaitRaw.avg)) : 0,
    };
  }
}
