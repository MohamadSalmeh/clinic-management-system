import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Raw, Repository, SelectQueryBuilder } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import {
  AdminAppointmentQueryDto,
  AppointmentQueryDto,
  AvailableDaysDto,
  CalculateAppointmentTimeDto,
  CancelAppointmentDto,
  CreateAppointmentDto,
  DoctorAppointmentQueryDto,
  WaitListDto,
  //RescheduleAppointmentDto,
} from './dto';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import {
  DoctorSchedule,
  DoctorScheduleType,
} from '../doctor-schedules/entities/doctor-schedule.entity';
import { DoctorLeave } from '../doctor-leaves/entities/doctor-leaves.entity';
import { DoctorClinic } from '../doctor-clinics/entities/doctor-clinic.entity';
import { MedicalProfilesService } from '../medical-profiles/medical-profiles.service';
import { ActiveUserData, UserRole } from '../utils';
import { forwardRef, Inject } from '@nestjs/common';
import { QueuesService } from '../queues/queues.service';
import { Wallet } from '../wallets/entities/wallet.entity';
import { SystemSetting } from '../system-setting/entities/system-setting.entity';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import { Payment } from '../payments/entities/payment.entity';
import { User } from '../users/entities/user.entity';
import { PatientViolation } from '../patient-violations/entities/patient-violation.entity';
import { UserStatus } from '../users/enums/user-status.enum';
import { ViolationCreatedBy } from '../patient-violations/enums/violation-created-by.enum';
import { ViolationType } from '../patient-violations/enums/violation-type.enum';
import { PaymentMethod } from '../payments/enums/payment-method.enum';

export type AppointmentGroupedResponse = {
  upcoming: Appointment[];
  completed: Appointment[];
  cancelled: Appointment[];
  noShow: Appointment[];
};

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(PatientProfile)
    private readonly patientProfileRepository: Repository<PatientProfile>,
    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepository: Repository<DoctorProfile>,
    @InjectRepository(Clinic)
    private readonly clinicRepository: Repository<Clinic>,
    @InjectRepository(DoctorSchedule)
    private readonly doctorScheduleRepository: Repository<DoctorSchedule>,
    @InjectRepository(DoctorLeave)
    private readonly doctorLeaveRepository: Repository<DoctorLeave>,
    @InjectRepository(DoctorClinic)
    private readonly doctorClinicRepository: Repository<DoctorClinic>,
    private readonly medicalProfilesService: MedicalProfilesService,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => QueuesService))
    private readonly queuesService: QueuesService,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(SystemSetting)
    private readonly systemSettingRepository: Repository<SystemSetting>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,

    @InjectRepository(PatientViolation)
    private readonly patientViolationRepository: Repository<PatientViolation>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  async createAppointment(
    userId: number,
    dto: CreateAppointmentDto,
  ): Promise<Appointment> {
    const patientProfile = await this.getPatientProfileByUserId(userId);
    await this.ensurePatientMedicalProfileComplete(userId);


    const user =
      await this.userRepository.findOne({

        where: {

          id: userId,

        },

      });

    if (
      user?.status ===
      UserStatus.SUSPENDED
    ) {

      throw new ForbiddenException(
        'Your account is suspended due to repeated violations.',
      );

    }

    /*await this.ensurePatientMedicalProfileComplete(
      userId,
    );*/


    const doctorProfile = await this.getDoctorProfileById(dto.doctorId);
    const clinic = await this.getClinicById(dto.clinicId);

    let appointmentFee = 0;

    if (dto.type === 'Initial Visit') {
      appointmentFee = Number(doctorProfile.initialVisitFee ?? 0);
    } else {
      appointmentFee = Number(doctorProfile.returnVisitFee ?? 0);
    }
    if (appointmentFee <= 0) {

      throw new BadRequestException(
        'Doctor visit fee is not configured',
      );

    }

    /* const wallet = await this.walletRepository.findOne({
       where: {
         userId,
       },
     });
 
     if (!wallet) {
       throw new NotFoundException('Wallet not found');
     }
 
     if (Number(wallet.availableBalance) < appointmentFee) {
       throw new BadRequestException(
         'Insufficient wallet balance',
       );
     }*/

    await this.ensureDoctorClinicAssignment(doctorProfile.id, clinic.id);
    await this.ensureAppointmentSlotIsValid(
      doctorProfile.id,
      clinic.id,
      dto.requestedDate,
      dto.startTime,
      dto.endTime,
    );


    return this.dataSource.transaction(async (manager) => {
      const walletRepository =
        manager.getRepository(Wallet);

      const wallet =
        await walletRepository.findOne({

          where: {

            userId,

          },

        });

      if (!wallet) {

        throw new NotFoundException(
          'Wallet not found',
        );

      }

      if (
        Number(wallet.availableBalance)
        <
        appointmentFee
      ) {

        throw new BadRequestException(
          'Insufficient wallet balance',
        );

      }
      const appointmentRepository = manager.getRepository(Appointment);

      await this.ensureNoConfirmedAppointmentOverlap(
        appointmentRepository,
        doctorProfile.id,
        dto.requestedDate,
        dto.startTime,
        dto.endTime,
      );



      const appointment = appointmentRepository.create({

        patientId: patientProfile.id,
        doctorId: doctorProfile.id,
        clinicId: clinic.id,
        requestedDate: this.parseDate(dto.requestedDate),
        startTime: dto.startTime,
        endTime: dto.endTime,
        type: dto.type,
        priority: dto.priority,
        status: 'pending',
        actualStartTime: null,
        actualEndTime: null,
        reasonForVisit: dto.reasonForVisit ?? null,
        symptoms: dto.symptoms ?? null,
        cancellationReason: null,
        cancelledAt: null,
        checkinTime: null,
        notes: null,

      });

      await appointmentRepository.save(
        appointment,
      );

      wallet.availableBalance =
        (
          Number(wallet.availableBalance)
          -
          appointmentFee
        ).toFixed(2);

      wallet.frozenBalance =
        (
          Number(wallet.frozenBalance)
          +
          appointmentFee
        ).toFixed(2);

      await walletRepository.save(
        wallet,
      );

      const payment =
        manager
          .getRepository(Payment)
          .create({

            appointmentId:
              appointment.id,

            walletId:
              wallet.id,

            userId,

            amount:
              appointmentFee.toFixed(2),

            appointmentType:
              appointment.type,

            paymentMethod:
              PaymentMethod.WALLET,

            status:
              PaymentStatus.HELD,

            penaltyAmount:
              '0',

            refundAmount:
              '0',

            paidAt:
              new Date(),

          });

      await manager
        .getRepository(Payment)
        .save(payment);

      appointment.status =
        'confirmed';

      //appointment.payment = payment;

      await appointmentRepository.save(
        appointment,
      );

      return appointment;
    });
  }

  async getMyAppointments(
    userId: number,
    query: AppointmentQueryDto,
  ): Promise<Appointment[] | AppointmentGroupedResponse> {
    const patientProfile = await this.getPatientProfileByUserId(userId);

    const appointments = await this.appointmentRepository.find({
      where: {
        patientId: patientProfile.id,
        ...(query.status ? { status: query.status } : {}),
      },
      relations: {
        doctor: { user: true },
        clinic: true,
      },
      order: { requestedDate: 'DESC', startTime: 'DESC' },
    });

    if (query.grouped) {
      return this.groupAppointments(appointments);
    }

    return appointments;
  }

  async getMyUpcomingAppointments(userId: number): Promise<Appointment[]> {
    const patientProfile = await this.getPatientProfileByUserId(userId);

    return this.buildAppointmentBaseQuery()
      .where('appointment.patientId = :patientId', {
        patientId: patientProfile.id,
      })
      .andWhere('appointment.status = :status', { status: 'confirmed' })
      .andWhere(
        '(appointment.requestedDate > :today OR (appointment.requestedDate = :today AND appointment.startTime > :currentTime))',
        {
          today: this.todayDateString(),
          currentTime: this.currentTimeString(),
        },
      )
      .orderBy('appointment.requestedDate', 'ASC')
      .addOrderBy('appointment.startTime', 'ASC')
      .getMany();
  }

  async getAppointmentById(
    id: number,
    currentUser: ActiveUserData,
  ): Promise<Appointment> {
    const appointment = await this.getAppointmentWithRelations(id);
    await this.ensureAppointmentAccess(appointment, currentUser);
    return appointment;
  }

  async getDoctorAppointments(
    userId: number,
    query: DoctorAppointmentQueryDto,
  ): Promise<Appointment[]> {
    const doctorProfile = await this.getDoctorProfileByUserId(userId);
    const qb = this.buildAppointmentBaseQuery().where(
      'appointment.doctorId = :doctorId',
      {
        doctorId: doctorProfile.id,
      },
    );

    this.applyCommonFilters(qb, query.status, query.from, query.to);

    if (query.date) {
      qb.andWhere('appointment.requestedDate = :date', { date: query.date });
    }

    return qb
      .orderBy('appointment.requestedDate', 'DESC')
      .addOrderBy('appointment.startTime', 'DESC')
      .getMany();
  }

  async getDoctorUpcomingAppointments(userId: number): Promise<Appointment[]> {
    const doctorProfile = await this.getDoctorProfileByUserId(userId);

    return this.buildAppointmentBaseQuery()
      .where('appointment.doctorId = :doctorId', { doctorId: doctorProfile.id })
      .andWhere('appointment.status = :status', { status: 'confirmed' })
      .andWhere(
        '(appointment.requestedDate > :today OR (appointment.requestedDate = :today AND appointment.startTime > :currentTime))',
        {
          today: this.todayDateString(),
          currentTime: this.currentTimeString(),
        },
      )
      .orderBy('appointment.requestedDate', 'ASC')
      .addOrderBy('appointment.startTime', 'ASC')
      .getMany();
  }

  async getAdminAppointments(
    query: AdminAppointmentQueryDto,
  ): Promise<Appointment[]> {
    const qb = this.buildAppointmentBaseQuery();

    if (query.doctorId !== undefined) {
      qb.andWhere('appointment.doctorId = :doctorId', {
        doctorId: query.doctorId,
      });
    }

    if (query.patientId !== undefined) {
      qb.andWhere('appointment.patientId = :patientId', {
        patientId: query.patientId,
      });
    }

    if (query.clinicId !== undefined) {
      qb.andWhere('appointment.clinicId = :clinicId', {
        clinicId: query.clinicId,
      });
    }

    if (query.status) {
      qb.andWhere('appointment.status = :status', { status: query.status });
    }

    if (query.paymentStatus) {
      qb.andWhere('appointment.paymentStatus = :paymentStatus', {
        paymentStatus: query.paymentStatus,
      });
    }

    if (query.from) {
      qb.andWhere('appointment.requestedDate >= :from', { from: query.from });
    }

    if (query.to) {
      qb.andWhere('appointment.requestedDate <= :to', { to: query.to });
    }

    return qb
      .orderBy('appointment.requestedDate', 'DESC')
      .addOrderBy('appointment.startTime', 'DESC')
      .getMany();
  }

  async cancelAppointment(
    id: number,
    currentUser: ActiveUserData,
    dto: CancelAppointmentDto,
  ): Promise<Appointment> {
    const appointment = await this.getAppointmentWithRelations(id);

    await this.ensureAppointmentAccessForCancellation(
      appointment,
      currentUser,
    );

    const role = this.getUserRole(currentUser);
    if (appointment.status === 'completed') {
      throw new BadRequestException(
        'Completed appointments cannot be cancelled',
      );
    }

    if (appointment.status === 'no_show') {
      throw new BadRequestException('No-show appointments cannot be cancelled');
    }

    if (appointment.status === 'cancelled') {
      throw new BadRequestException(
        'Appointment is already cancelled',
      );
    }
    return this.dataSource.transaction(async (manager) => {

      const appointmentRepo =
        manager.getRepository(Appointment);

      const paymentRepo =
        manager.getRepository(Payment);

      const walletRepo =
        manager.getRepository(Wallet);

      const settingRepo =
        manager.getRepository(SystemSetting);

      const payment =
        await paymentRepo.findOne({

          where: {

            appointmentId: appointment.id,

          },

        });

      appointment.status = 'cancelled';

      appointment.cancelledAt = new Date();

      appointment.cancellationReason =
        dto.cancellationReason ?? null;

      if (!payment) {

        return appointmentRepo.save(
          appointment,
        );

      }

      const wallet =
        await walletRepo.findOne({

          where: {

            id: payment.walletId!,

          },

        });

      if (!wallet) {

        return appointmentRepo.save(
          appointment,
        );

      }

      const amount =
        Number(payment.amount);

      if (role === UserRole.DOCTOR ||
        role === UserRole.ADMIN) {

        wallet.frozenBalance =
          (
            Number(wallet.frozenBalance)
            -
            amount
          ).toFixed(2);

        wallet.availableBalance =
          (
            Number(wallet.availableBalance)
            +
            amount
          ).toFixed(2);

        payment.refundAmount =
          amount.toFixed(2);

        payment.status =
          PaymentStatus.REFUNDED;

      } else {

        const settings = await settingRepo.findOne({
          where: {
            id: 1,
          },
        });

        if (!settings) {

          throw new NotFoundException(
            'System settings not found',
          );

        }

        const appointmentDate =
          appointment.requestedDate instanceof Date
            ? appointment.requestedDate.toISOString().slice(0, 10)
            : appointment.requestedDate;

        const appointmentDateTime = new Date(
          `${appointmentDate}T${appointment.startTime}`,
        );

        const diffDays =
          (
            appointmentDateTime.getTime()
            -
            Date.now()
          ) / (1000 * 60 * 60 * 24);

        wallet.frozenBalance =
          (
            Number(wallet.frozenBalance)
            -
            amount
          ).toFixed(2);

        if (
          diffDays >=
          settings.cancelBeforeDays
        ) {

          wallet.availableBalance =
            (
              Number(wallet.availableBalance)
              +
              amount
            ).toFixed(2);

          payment.refundAmount =
            amount.toFixed(2);

          payment.status =
            PaymentStatus.REFUNDED;

        } else {

          const penalty =
            amount *
            Number(
              settings.lateCancelPenaltyPercent,
            ) /
            100;

          const refund =
            amount - penalty;

          wallet.availableBalance =
            (
              Number(wallet.availableBalance)
              +
              refund
            ).toFixed(2);

          payment.refundAmount =
            refund.toFixed(2);

          payment.penaltyAmount =
            penalty.toFixed(2);

          payment.status =
            PaymentStatus.PARTIAL_REFUNDED;

        }

      }

      await walletRepo.save(wallet);

      await paymentRepo.save(payment);

      return appointmentRepo.save(
        appointment,
      );

    });
    /*
    appointment.status = 'cancelled';
    appointment.cancelledAt = new Date();
    appointment.cancellationReason =
      dto.cancellationReason ?? null;
    
    return this.appointmentRepository.save(
      appointment,
    );
    
    */


  }

  async checkInAppointment(
    id: number,
    currentUser: ActiveUserData,
  ): Promise<any> {
    return this.queuesService.createQueueEntry(id, currentUser);
  }

  async completeAppointment(
    id: number,
    currentUser: ActiveUserData,
  ): Promise<any> {
    const appointment = await this.getAppointmentWithRelations(id);
    this.ensureDoctorOwnership(appointment, currentUser);

    if (!appointment.queue) {
      throw new BadRequestException(
        'This appointment does not have an active queue record.',
      );
    }

    return this.queuesService.completeConsultation(
      appointment.queue.id,
      currentUser,
    );
  }

  private async applyNoShow(

    appointment: Appointment,

    manager: EntityManager,

    createdBy: ViolationCreatedBy,

  ): Promise<void> {

    const appointmentRepo =
      manager.getRepository(Appointment);

    const paymentRepo =
      manager.getRepository(Payment);

    const walletRepo =
      manager.getRepository(Wallet);

    const patientRepo =
      manager.getRepository(PatientProfile);

    const userRepo =
      manager.getRepository(User);

    const settingRepo =
      manager.getRepository(SystemSetting);

    const violationRepo =
      manager.getRepository(PatientViolation);

    appointment.status = 'no_show';

    const payment =
      await paymentRepo.findOne({

        where: {

          appointmentId:
            appointment.id,

        },

      });

    if (payment) {

      if (
        payment.status ===
        PaymentStatus.FORFEITED
      ) {

        throw new BadRequestException(
          'Appointment already marked as no-show',
        );

      }
      if (
        payment.status !==
        PaymentStatus.HELD
      ) {

        throw new BadRequestException(
          'Payment is not held',
        );

      }

      const wallet =
        await walletRepo.findOne({

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

        await walletRepo.save(wallet);

      }

      payment.status =
        PaymentStatus.FORFEITED;
      payment.penaltyAmount =
        payment.amount;

      await paymentRepo.save(payment);

    }

    const patient =
      await patientRepo.findOne({

        where: {

          id: appointment.patientId,

        },

      });

    if (patient) {

      patient.noShowCount =
        Number(patient.noShowCount ?? 0) + 1;

      await patientRepo.save(patient);

      const violation =
        violationRepo.create({

          userId: patient.userId,

          appointmentId:
            appointment.id,

          type:
            ViolationType.NO_SHOW,

          createdBy,


          notes:
            'Patient did not attend appointment',

        });

      await violationRepo.save(
        violation,
      );

      const settings =
        await settingRepo.findOne({

          where: {

            id: 1,

          },

        });

      if (
        settings &&
        patient.noShowCount >=
        settings.maxNoShowCount
      ) {

        await userRepo.update(

          {

            id: patient.userId,

          },

          {

            status:
              UserStatus.SUSPENDED,

          },

        );

      }

    }

    await appointmentRepo.save(
      appointment,
    );
  }
  async markNoShow(
    id: number,
    currentUser: ActiveUserData,
  ): Promise<Appointment> {

    const appointment =
      await this.getAppointmentWithRelations(
        id,
      );

    this.ensureDoctorOwnership(
      appointment,
      currentUser,
    );
    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0,
    );

    const appointmentDate =
      new Date(
        appointment.requestedDate,
      );

    appointmentDate.setHours(
      0,
      0,
      0,
      0,
    );

    if (
      appointmentDate >
      today
    ) {

      throw new BadRequestException(
        'Future appointments cannot be marked as no-show',
      );

    }

    if (appointment.status === 'no_show') {

      throw new BadRequestException(
        'Appointment already marked as no-show',
      );

    }

    if (appointment.status === 'completed') {

      throw new BadRequestException(
        'Completed appointment cannot become no-show',
      );

    }

    if (appointment.status === 'cancelled') {

      throw new BadRequestException(
        'Cancelled appointment cannot become no-show',
      );

    }

    await this.dataSource.transaction(

      async (manager) => {

        await this.applyNoShow(

          appointment,

          manager,

          ViolationCreatedBy.DOCTOR,

        );

      },

    );

    return this.getAppointmentWithRelations(
      id,
    );

  }
  /*async markNoShow(
    id: number,
    currentUser: ActiveUserData,
  ): Promise<Appointment> {

    const appointment =
      await this.getAppointmentWithRelations(id);

    this.ensureDoctorOwnership(
      appointment,
      currentUser,
    );

    if (appointment.status === 'no_show') {
      throw new BadRequestException(
        'Appointment already marked as no-show',
      );
    }

    if (appointment.status === 'completed') {
      throw new BadRequestException(
        'Completed appointment cannot become no-show',
      );
    }
    if (appointment.status === 'cancelled') {

      throw new BadRequestException(
        'Cancelled appointment cannot become no-show',
      );

    }

    return this.dataSource.transaction(async (manager) => {


    });

  }*/

  /*async rescheduleAppointment(
        id: number,
        currentUser: ActiveUserData,
        dto: RescheduleAppointmentDto,
    ): Promise<Appointment> {
        const appointment = await this.getAppointmentWithRelations(id);
        await this.ensureAppointmentAccessForReschedule(appointment, currentUser);

        if (appointment.status === 'completed') {
            throw new BadRequestException('Completed appointments cannot be rescheduled');
        }

        if (appointment.status === 'no_show') {
            throw new BadRequestException('No-show appointments cannot be rescheduled');
        }

        await this.ensureAppointmentSlotIsValid(
            appointment.doctorId,
            appointment.clinicId,
            dto.requestedDate,
            dto.startTime,
            dto.endTime,
        );

        await this.ensureNoConfirmedAppointmentOverlap(
            this.appointmentRepository,
            appointment.doctorId,
            dto.requestedDate,
            dto.startTime,
            dto.endTime,
            appointment.id,
        );

        appointment.requestedDate = this.parseDate(dto.requestedDate);
        appointment.startTime = dto.startTime;
        appointment.endTime = dto.endTime;

        return this.appointmentRepository.save(appointment);
    }
*/
  private async ensurePatientMedicalProfileComplete(
    userId: number,
  ): Promise<void> {
    try {
      const completion =
        await this.medicalProfilesService.getCompletionStatus(userId);

      if (!completion.completed) {
        throw new BadRequestException(
          'Medical profile must be complete before creating an appointment',
        );
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new BadRequestException(
          'Medical profile must be complete before creating an appointment',
        );
      }

      throw error;
    }
  }

  private async getPatientProfileByUserId(
    userId: number,
  ): Promise<PatientProfile> {
    const patientProfile = await this.patientProfileRepository.findOne({
      where: { userId },
      relations: { user: true },
    });

    if (!patientProfile) {
      throw new NotFoundException('Patient profile not found');
    }

    return patientProfile;
  }

  private async getDoctorProfileByUserId(
    userId: number,
  ): Promise<DoctorProfile> {
    const doctorProfile = await this.doctorProfileRepository.findOne({
      where: { userId },
      relations: { user: true },
    });

    if (!doctorProfile) {
      throw new NotFoundException('Doctor profile not found');
    }

    return doctorProfile;
  }

  private async getDoctorProfileById(id: number): Promise<DoctorProfile> {
    const doctorProfile = await this.doctorProfileRepository.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!doctorProfile) {
      throw new NotFoundException('Doctor profile not found');
    }

    return doctorProfile;
  }

  private async getClinicById(id: number): Promise<Clinic> {
    const clinic = await this.clinicRepository.findOne({ where: { id } });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    return clinic;
  }

  private async ensureDoctorClinicAssignment(
    doctorId: number,
    clinicId: number,
  ): Promise<void> {
    const assignment = await this.doctorClinicRepository.findOne({
      where: { doctorId, clinicId },
    });

    if (!assignment) {
      throw new BadRequestException('Doctor is not assigned to this clinic');
    }
  }

  private async ensureAppointmentSlotIsValid(
    doctorId: number,
    clinicId: number,
    requestedDate: string,
    startTime: string,
    endTime: string,
  ): Promise<void> {
    this.validateTimeRange(startTime, endTime);

    const dayOfWeek = this.getDayOfWeek(requestedDate);
    console.log(requestedDate);
    console.log(dayOfWeek);
    const schedules = await this.doctorScheduleRepository.find({
      where: {
        doctorProfileId: doctorId,
        clinicId,
        dayOfWeek,
        isActive: true,
      },
    });

    if (schedules.length === 0) {
      throw new BadRequestException(
        'Doctor has no active schedule in this clinic for the requested day',
      );
    }

    const workingSchedules = schedules.filter(
      (schedule) => schedule.type !== DoctorScheduleType.BREAK,
    );
    const breakSchedules = schedules.filter(
      (schedule) => schedule.type === DoctorScheduleType.BREAK,
    );
    console.log(workingSchedules);
    console.log(startTime, endTime);

    workingSchedules.forEach((s) => {
      console.log(
        s.startTime,
        s.endTime,
        this.isTimeInsideRange(startTime, endTime, s.startTime, s.endTime),
      );
    });
    const insideWorkingSchedule = workingSchedules.some((schedule) =>
      this.isTimeInsideRange(
        startTime,
        endTime,
        schedule.startTime,
        schedule.endTime,
      ),
    );

    if (!insideWorkingSchedule) {
      throw new BadRequestException(
        'Appointment time is outside doctor schedule',
      );
    }

    const overlapsBreak = breakSchedules.some((schedule) =>
      this.isOverlap(startTime, endTime, schedule.startTime, schedule.endTime),
    );

    if (overlapsBreak) {
      throw new BadRequestException(
        'Appointment time overlaps doctor break time',
      );
    }

    const leaves = await this.doctorLeaveRepository.find({
      where: {
        doctorProfileId: doctorId,
        exceptionDate: Raw((alias) => `DATE(${alias}) = :requestedDate`, {
          requestedDate,
        }),
      },
    });

    const overlapsLeave = leaves.some((leave) => {
      if (!leave.startTime || !leave.endTime) {
        return true;
      }

      return this.isOverlap(startTime, endTime, leave.startTime, leave.endTime);
    });

    if (overlapsLeave) {
      throw new BadRequestException(
        'Doctor has a leave that overlaps the requested time',
      );
    }
  }

  private async ensureNoConfirmedAppointmentOverlap(
    appointmentRepository: Repository<Appointment>,
    doctorId: number,
    requestedDate: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: number,
  ): Promise<void> {
    const qb = appointmentRepository
      .createQueryBuilder('appointment')
      .where('appointment.doctorId = :doctorId', { doctorId })
      .andWhere('DATE(appointment.requestedDate) = :requestedDate', {
        requestedDate,
      })
      .andWhere('appointment.status IN (:...statuses)', {
        statuses: ['pending', 'confirmed'],
      });

    if (excludeAppointmentId !== undefined) {
      qb.andWhere('appointment.id != :excludeAppointmentId', {
        excludeAppointmentId,
      });
    }
    console.log({
      doctorId,
      requestedDate,
    });
    console.log(
      await appointmentRepository.find({
        where: {
          doctorId,
        },
      }),
    );
    const appointments = await qb.getMany();
    console.log(appointments.length);
    console.log(appointments);
    const hasOverlap = appointments.some((appointment) =>
      this.isOverlap(
        startTime,
        endTime,
        appointment.startTime,
        appointment.endTime,
      ),
    );

    if (hasOverlap) {
      throw new BadRequestException(
        'Appointment time overlaps an existing confirmed appointment',
      );
    }
  }

  private async getAppointmentWithRelations(id: number): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id },
      relations: {
        patient: { user: true },
        doctor: { user: true },
        clinic: true,
        payment: true,
        rating: true,
        queue: true,
        referral: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  private async ensureAppointmentAccess(
    appointment: Appointment,
    currentUser: ActiveUserData,
  ): Promise<void> {
    const role = this.getUserRole(currentUser);

    if (role === UserRole.ADMIN) {
      return;
    }

    if (role === UserRole.PATIENT) {
      if (Number(appointment.patient?.userId) !== currentUser.sub) {
        throw new ForbiddenException(
          'You do not have access to this appointment',
        );
      }

      return;
    }

    console.log('appointment.doctor =', appointment.doctor);
    console.log('appointment.patient =', appointment.patient);
    console.log('currentUser =', currentUser);
    if (role === UserRole.DOCTOR) {
      if (Number(appointment.doctor?.userId) !== currentUser.sub) {
        throw new ForbiddenException(
          'You do not have access to this appointment',
        );
      }

      return;
    }

    throw new ForbiddenException('You do not have access to this appointment');
  }

  private async ensureAppointmentAccessForCancellation(
    appointment: Appointment,
    currentUser: ActiveUserData,
  ): Promise<void> {
    const role = this.getUserRole(currentUser);
    //
    if (role === UserRole.ADMIN) {
      return;
    }

    if (
      role === UserRole.PATIENT &&
      Number(appointment.patient?.userId) === currentUser.sub
    ) {
      return;
    }

    if (
      role === UserRole.DOCTOR &&
      Number(appointment.doctor?.userId) === Number(currentUser.sub)
    ) {
      return;
    }

    throw new ForbiddenException('You do not have access to this appointment');
  }

  private async ensureAppointmentAccessForReschedule(
    appointment: Appointment,
    currentUser: ActiveUserData,
  ): Promise<void> {
    await this.ensureAppointmentAccessForCancellation(appointment, currentUser);
  }

  private ensureDoctorOwnership(
    appointment: Appointment,
    currentUser: ActiveUserData,
  ): void {
    if (this.getUserRole(currentUser) !== UserRole.DOCTOR) {
      throw new ForbiddenException(
        'You do not have access to this appointment',
      );
    }

    console.log('appointment.doctor =', appointment.doctor);
    console.log('appointment.patient =', appointment.patient);
    console.log('currentUser =', currentUser);
    if (Number(appointment.doctor?.userId) !== currentUser.sub) {
      throw new ForbiddenException(
        'You do not have access to this appointment',
      );
    }
  }

  private buildAppointmentBaseQuery(): SelectQueryBuilder<Appointment> {
    return this.appointmentRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('patient.user', 'patientUser')
      .leftJoinAndSelect('appointment.doctor', 'doctor')
      .leftJoinAndSelect('doctor.user', 'doctorUser')
      .leftJoinAndSelect('appointment.clinic', 'clinic');
  }

  private applyCommonFilters(
    qb: SelectQueryBuilder<Appointment>,
    status?: string,
    from?: string,
    to?: string,
  ): void {
    if (status) {
      qb.andWhere('appointment.status = :status', { status });
    }

    if (from) {
      qb.andWhere('appointment.requestedDate >= :from', { from });
    }

    if (to) {
      qb.andWhere('appointment.requestedDate <= :to', { to });
    }
  }

  private groupAppointments(
    appointments: Appointment[],
  ): AppointmentGroupedResponse {
    const grouped: AppointmentGroupedResponse = {
      upcoming: [],
      completed: [],
      cancelled: [],
      noShow: [],
    };

    for (const appointment of appointments) {
      switch (appointment.status) {
        case 'confirmed':
          grouped.upcoming.push(appointment);
          break;
        case 'completed':
          grouped.completed.push(appointment);
          break;
        case 'cancelled':
          grouped.cancelled.push(appointment);
          break;
        case 'no_show':
          grouped.noShow.push(appointment);
          break;
        default:
          break;
      }
    }

    return grouped;
  }

  private validateTimeRange(startTime: string, endTime: string): void {
    if (startTime >= endTime) {
      throw new BadRequestException('Invalid appointment time range');
    }
  }

  private isTimeInsideRange(
    startTime: string,
    endTime: string,
    rangeStart: string,
    rangeEnd: string,
  ): boolean {
    return startTime >= rangeStart && endTime <= rangeEnd;
  }

  private isOverlap(
    startA: string,
    endA: string,
    startB: string,
    endB: string,
  ): boolean {
    return startA < endB && endA > startB;
  }

  private parseDate(date: string): Date {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  private getDayOfWeek(date: string): number {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
  }

  private todayDateString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private currentTimeString(): string {
    return new Date().toISOString().slice(11, 16);
  }

  private getUserRole(currentUser: ActiveUserData): UserRole {
    return currentUser.usertype.toLowerCase() as UserRole;
  }
  //
  async calculateNextAvailableTime(dto: CalculateAppointmentTimeDto) {

    const schedule = await this.doctorScheduleRepository.findOne({
      where: {
        id: dto.scheduleId,
        doctorProfileId: dto.doctorId,
        clinicId: dto.clinicId,
        isActive: true,
      },
    });

    if (!schedule) {
      throw new BadRequestException('Schedule not found');
    }

    const duration =
      dto.type === 'Initial Visit'
        ? 30
        : 20;

    const appointments = await this.appointmentRepository
      .createQueryBuilder('appointment')
      .where('appointment.doctorId = :doctorId', {
        doctorId: dto.doctorId,
      })
      .andWhere('DATE(appointment.requestedDate)=:date', {
        date: dto.requestedDate,
      })
      .andWhere('appointment.status IN (:...status)', {
        status: ['pending', 'confirmed'],
      })
      .orderBy('appointment.endTime', 'ASC')
      .getMany();

    let start = schedule.startTime;

    if (appointments.length > 0) {

      const insideSchedule = appointments.filter(a =>
        a.startTime >= schedule.startTime &&
        a.endTime <= schedule.endTime,
      );

      if (insideSchedule.length > 0) {

        start = insideSchedule[insideSchedule.length - 1].endTime;
      }
    }

    const end = this.addMinutes(start, duration);

    if (end > schedule.endTime) {
      throw new BadRequestException(
        'No available time in this schedule',
      );
    }

    return {
      startTime: start,
      endTime: end,
    };
  }
  private addMinutes(time: string, minutes: number): string {

    const [h, m, s] = time.split(':').map(Number);

    const date = new Date();

    date.setHours(h);
    date.setMinutes(m + minutes);
    date.setSeconds(s || 0);

    return date.toTimeString().slice(0, 8);
  }
  async getWaitList(dto: WaitListDto) {

    const appointments = await this.appointmentRepository
      .createQueryBuilder('appointment')
      .where('appointment.doctorId = :doctorId', {
        doctorId: dto.doctorId,
      })
      .andWhere('appointment.clinicId = :clinicId', {
        clinicId: dto.clinicId,
      })
      .andWhere('DATE(appointment.requestedDate)=:requestedDate', {
        requestedDate: dto.requestedDate,
      })
      .andWhere('appointment.status = :status', {
        status: 'cancelled',
      })
      .orderBy('appointment.startTime', 'ASC')
      .getMany();

    return appointments.map((appointment) => ({
      appointmentId: appointment.id,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
    }));
  }
  async getAvailableDays(dto: AvailableDaysDto) {
    const schedules = await this.doctorScheduleRepository.find({
      where: {
        doctorProfileId: dto.doctorId,
        clinicId: dto.clinicId,
        isActive: true,
      },
    });

    if (schedules.length === 0) {
      return [];
    }

    const leaves = await this.doctorLeaveRepository.find({
      where: {
        doctorProfileId: dto.doctorId,
      },
    });

    const result: {
      date: string;
      dayOfWeek: number;
    }[] = [];

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const end = new Date(today);
    end.setFullYear(end.getFullYear() + 1);

    while (today <= end) {

      const dayOfWeek = today.getDay();

      const hasSchedule = schedules.some(
        (schedule) =>
          schedule.type !== DoctorScheduleType.BREAK &&
          schedule.dayOfWeek === dayOfWeek,
      );

      if (hasSchedule) {

        const dateString = today.toISOString().slice(0, 10);

        const hasFullDayLeave = leaves.some((leave) => {

          const leaveDate = new Date(leave.exceptionDate);
          leaveDate.setHours(12, 0, 0, 0);

          return (
            leaveDate.toISOString().slice(0, 10) === dateString &&
            leave.startTime === null &&
            leave.endTime === null
          );
        });

        if (!hasFullDayLeave) {
          result.push({
            date: dateString,
            dayOfWeek,
          });
        }
      }

      today.setDate(today.getDate() + 1);
    }

    return result;
  }
  async processDailyNoShows(): Promise<void> {

    const yesterday = new Date();

    yesterday.setDate(
      yesterday.getDate() - 1,
    );

    const yesterdayString =
      yesterday
        .toISOString()
        .split('T')[0];

    const appointments =
      await this.appointmentRepository

        .createQueryBuilder('appointment')

        .where(
          'appointment.status = :status',
          {
            status: 'confirmed',
          },
        )

        .andWhere(
          'appointment.requestedDate = :yesterday',
          {
            yesterday: yesterdayString,
          },
        )

        .getMany();

    if (!appointments.length) {

      return;

    }

    await this.dataSource.transaction(

      async (manager) => {

        for (const appointment of appointments) {

          await this.applyNoShow(

            appointment,

            manager,

            ViolationCreatedBy.SYSTEM,

          );

        }

      },

    );

  }

  //
}
