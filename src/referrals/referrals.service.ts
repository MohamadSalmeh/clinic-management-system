import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, Brackets } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

import {
  Referral,
  ReferralType,
  ReferralStatus,
} from './entities/referral.entity';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { AppointmentsService } from '../appointments/appointments.service';
import {
  CreateReferralDto,
  ReferralQueryDto,
  PatientReferralQueryDto,
} from './dto';
import { ActiveUserData } from '../utils';
import { addDays, endOfDay, nowDate } from '../common/utils/date-utils';
import { DoctorClinic } from '../doctor-clinics/entities/doctor-clinic.entity';
import { SystemSetting } from '../system-setting/entities/system-setting.entity';
import { CancelReferralDto } from './dto/cancel-referral.dto';
import {
  ReferralCreatedEvent,
  ReferralCancelledEvent,
  ReferralExpiringEvent,
} from '../notifications/events';

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,

    @InjectRepository(PatientProfile)
    private readonly patientRepository: Repository<PatientProfile>,

    @InjectRepository(DoctorProfile)
    private readonly doctorRepository: Repository<DoctorProfile>,

    @Inject(forwardRef(() => AppointmentsService))
    private readonly appointmentsService: AppointmentsService,

    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ==========================================
  // 1. عمليات الأطباء (Doctor Operations)
  // ==========================================

  async createReferral(
    currentUser: ActiveUserData,
    dto: CreateReferralDto,
  ): Promise<Referral> {
    const doctor = await this.doctorRepository.findOne({
      where: { userId: currentUser.sub },
    });
    if (!doctor) {
      throw new NotFoundException(
        'Active doctor profile not found for this user',
      );
    }

    const fromDoctorId = doctor.id;

    const patient = await this.patientRepository.findOne({
      where: { id: dto.patientId },
    });
    if (!patient) {
      throw new NotFoundException(
        'Target patient profile not found or inactive',
      );
    }

    let toDoctorId = dto.toDoctorId ?? null;
    let toClinicId = dto.toClinicId ?? null;

    if (dto.type === ReferralType.FOLLOW_UP) {
      if (dto.toDoctorId && dto.toDoctorId !== fromDoctorId) {
        throw new BadRequestException(
          'In a follow-up referral, you cannot target another doctor. It must be yourself.',
        );
      }
      toDoctorId = fromDoctorId;
      toClinicId = null;
    } else if (dto.type === ReferralType.EXTERNAL) {
      await this.validateReferralTargets(toClinicId, toDoctorId);
    }

    const queryBuilder = this.referralRepository
      .createQueryBuilder('referral')
      .where('referral.patientId = :patientId', { patientId: dto.patientId })
      .andWhere('referral.type = :type', { type: dto.type })
      .andWhere('referral.status = :status', { status: ReferralStatus.PENDING })
      .andWhere('referral.fromDoctorId = :fromDoctorId', { fromDoctorId });

    if (toDoctorId) {
      queryBuilder.andWhere('referral.toDoctorId = :toDoctorId', {
        toDoctorId,
      });
    } else {
      queryBuilder.andWhere('referral.toDoctorId IS NULL');
    }

    if (toClinicId) {
      queryBuilder.andWhere('referral.toClinicId = :toClinicId', {
        toClinicId,
      });
    } else {
      queryBuilder.andWhere('referral.toClinicId IS NULL');
    }

    const existingPendingReferral = await queryBuilder.getOne();

    if (existingPendingReferral) {
      throw new ConflictException(
        'An active pending referral with the same specifications already exists for this patient.',
      );
    }

    const expiresAt = await this.calculateExpirationDate(dto.type);

    const referralData: Partial<Referral> = {
      patient: { id: dto.patientId } as PatientProfile,
      fromDoctor: { id: fromDoctorId } as DoctorProfile,
      toDoctor: toDoctorId ? ({ id: toDoctorId } as DoctorProfile) : null,
      toClinic: toClinicId ? ({ id: toClinicId } as Clinic) : null,
      type: dto.type,
      status: ReferralStatus.PENDING,
      expiresAt: expiresAt,
      reason: dto.reason,
    };

    const newReferral = this.referralRepository.create(referralData);
    const savedReferral = await this.referralRepository.save(newReferral);

    const result = await this.referralRepository.findOne({
      where: { id: savedReferral.id },
      relations: {
        patient: true,
        fromDoctor: { user: true },
        toDoctor: { user: true },
        toClinic: true,
      },
    });

    if (!result) {
      throw new NotFoundException(
        'Referral could not be retrieved after saving',
      );
    }

    await this.eventEmitter.emitAsync(
      ReferralCreatedEvent.eventName,
      new ReferralCreatedEvent({
        userId: patient.userId,
        referralId: result.id,
        expiresAt: result.expiresAt?.toISOString() ?? null,
        doctorName: result.toDoctor?.user
          ? `${result.toDoctor.user.firstName} ${result.toDoctor.user.lastName ?? ''}`.trim()
          : null,
        clinicName: result.toClinic?.name ?? null,
      }),
    );

    return result;
  }

  async getSentReferrals(
    currentUser: ActiveUserData,
    queryDto: ReferralQueryDto,
  ): Promise<PaginatedResponse<Referral>> {
    const doctor = await this.doctorRepository.findOne({
      where: { userId: currentUser.sub },
    });
    if (!doctor) {
      throw new ForbiddenException('Doctor profile not found');
    }

    const page = Number(queryDto.page) || 1;
    const limit = Number(queryDto.limit) || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.referralRepository
      .createQueryBuilder('referral')
      .leftJoinAndSelect('referral.patient', 'patient')
      .leftJoinAndSelect('patient.user', 'patientUser')
      .leftJoinAndSelect('referral.toDoctor', 'toDoctor')
      .leftJoinAndSelect('toDoctor.user', 'toDoctorUser')
      .leftJoinAndSelect('referral.toClinic', 'toClinic')
      .where('referral.fromDoctorId = :fromDoctorId', {
        fromDoctorId: doctor.id,
      });

    if (queryDto.status) {
      queryBuilder.andWhere('referral.status = :status', {
        status: queryDto.status,
      });
    }
    if (queryDto.type) {
      queryBuilder.andWhere('referral.type = :type', { type: queryDto.type });
    }

    // ✅ التصحيح: createdAt → created_at
    queryBuilder.orderBy('referral.created_at', 'DESC').skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return { data, meta: { total, page, limit, totalPages } };
  }

  async getReceivedReferrals(
    currentUser: ActiveUserData,
    queryDto: ReferralQueryDto,
  ): Promise<PaginatedResponse<Referral>> {
    const doctor = await this.doctorRepository.findOne({
      where: { userId: currentUser.sub },
    });
    if (!doctor) {
      throw new ForbiddenException('Doctor profile not found');
    }

    const page = Number(queryDto.page) || 1;
    const limit = Number(queryDto.limit) || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.referralRepository
      .createQueryBuilder('referral')
      .leftJoinAndSelect('referral.patient', 'patient')
      .leftJoinAndSelect('patient.user', 'patientUser')
      .leftJoinAndSelect('referral.fromDoctor', 'fromDoctor')
      .leftJoinAndSelect('fromDoctor.user', 'fromDoctorUser')
      .where('referral.toDoctorId = :currentDoctorId', {
        currentDoctorId: doctor.id,
      });

    if (queryDto.status) {
      queryBuilder.andWhere('referral.status = :status', {
        status: queryDto.status,
      });
    } else {
      queryBuilder.andWhere('referral.status = :status', {
        status: ReferralStatus.PENDING,
      });
    }

    // ✅ التصحيح: createdAt → created_at
    queryBuilder.orderBy('referral.created_at', 'DESC').skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return { data, meta: { total, page, limit, totalPages } };
  }

  // ==========================================
  // 2. عمليات المرضى (Patient Operations)
  // ==========================================

  async getMyReferrals(
    currentUser: ActiveUserData,
    queryDto: PatientReferralQueryDto,
  ): Promise<PaginatedResponse<Referral>> {
    const patient = await this.patientRepository.findOne({
      where: { userId: currentUser.sub },
    });
    if (!patient) {
      throw new ForbiddenException('Patient profile not found');
    }

    const page = Number(queryDto.page) || 1;
    const limit = Number(queryDto.limit) || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.referralRepository
      .createQueryBuilder('referral')
      .leftJoinAndSelect('referral.fromDoctor', 'fromDoctor')
      .leftJoinAndSelect('fromDoctor.user', 'fromDoctorUser')
      .leftJoinAndSelect('referral.toDoctor', 'toDoctor')
      .leftJoinAndSelect('toDoctor.user', 'toDoctorUser')
      .leftJoinAndSelect('referral.toClinic', 'toClinic')
      .where('referral.patientId = :patientId', { patientId: patient.id });

    if (queryDto.status) {
      queryBuilder.andWhere('referral.status = :status', {
        status: queryDto.status,
      });
    }

    // ✅ التصحيح: createdAt → created_at
    queryBuilder.orderBy('referral.created_at', 'DESC').skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return { data, meta: { total, page, limit, totalPages } };
  }

  async getMyActiveReferrals(currentUser: ActiveUserData): Promise<Referral[]> {
    const patient = await this.patientRepository.findOne({
      where: { userId: currentUser.sub },
    });
    if (!patient) {
      throw new ForbiddenException('Patient profile not found');
    }

    const now = nowDate();

    return await this.referralRepository
      .createQueryBuilder('referral')
      .leftJoinAndSelect('referral.toClinic', 'toClinic')
      .leftJoinAndSelect('referral.toDoctor', 'toDoctor')
      .leftJoinAndSelect('toDoctor.user', 'toDoctorUser')
      .where('referral.patientId = :patientId', { patientId: patient.id })
      .andWhere('referral.status = :status', { status: ReferralStatus.PENDING })
      .andWhere('(referral.expiresAt IS NULL OR referral.expiresAt > :now)', {
        now,
      })
      .orderBy('referral.expiresAt', 'ASC')
      .getMany();
  }

  // ==========================================
  // 3. عمليات مدير النظام (Admin Operations)
  // ==========================================

  async findAllReferralsForAdmin(
  queryDto: ReferralQueryDto,
): Promise<PaginatedResponse<Referral>> {
  const page = Number(queryDto.page) || 1;
  const limit = Number(queryDto.limit) || 10;
  const skip = (page - 1) * limit;

  const queryBuilder = this.referralRepository
    .createQueryBuilder('referral')
    .leftJoinAndSelect('referral.patient', 'patient')
    .leftJoinAndSelect('patient.user', 'patientUser')
    .leftJoinAndSelect('referral.fromDoctor', 'fromDoctor')
    .leftJoinAndSelect('fromDoctor.user', 'fromDoctorUser')
    .leftJoinAndSelect('referral.toDoctor', 'toDoctor')
    .leftJoinAndSelect('toDoctor.user', 'toDoctorUser')
    .leftJoinAndSelect('referral.toClinic', 'toClinic')
    .leftJoinAndSelect('referral.appointment', 'appointment');

  // ==========================================
  // الفلاتر الأساسية (IDs)
  // ==========================================

  if (queryDto.patientId) {
    queryBuilder.andWhere('referral.patientId = :patientId', {
      patientId: Number(queryDto.patientId),
    });
  }

  if (queryDto.fromDoctorId) {
    queryBuilder.andWhere('referral.fromDoctorId = :fromDoctorId', {
      fromDoctorId: Number(queryDto.fromDoctorId),
    });
  }

  if (queryDto.toDoctorId) {
    queryBuilder.andWhere('referral.toDoctorId = :toDoctorId', {
      toDoctorId: Number(queryDto.toDoctorId),
    });
  }

  // دعم كل من toClinicId و clinicId (مرونة)
  const clinicId = queryDto.toClinicId ?? queryDto.clinicId;
  if (clinicId) {
    queryBuilder.andWhere('referral.toClinicId = :clinicId', {
      clinicId: Number(clinicId),
    });
  }

  if (queryDto.status) {
    queryBuilder.andWhere('referral.status = :status', {
      status: queryDto.status,
    });
  }

  if (queryDto.type) {
    queryBuilder.andWhere('referral.type = :type', { type: queryDto.type });
  }

  // ==========================================
  // ✅ فلتر حسب تخصص الدكتور (من الـ DoctorProfile)
  // ==========================================
  if (queryDto.specialization) {
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where('fromDoctor.specialization ILike :specialization', {
          specialization: `%${queryDto.specialization}%`,
        }).orWhere('toDoctor.specialization ILike :specialization', {
          specialization: `%${queryDto.specialization}%`,
        });
      }),
    );
  }

  // ==========================================
  // ✅ فلتر حسب اسم العيادة
  // ==========================================
  if (queryDto.clinicName) {
    queryBuilder.andWhere('toClinic.name ILike :clinicName', {
      clinicName: `%${queryDto.clinicName}%`,
    });
  }

  // ==========================================
  // ✅ فلتر حسب اسم المريض
  // ==========================================
  if (queryDto.patientName) {
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where('patientUser.firstName ILike :patientName', {
          patientName: `%${queryDto.patientName}%`,
        }).orWhere('patientUser.lastName ILike :patientName', {
          patientName: `%${queryDto.patientName}%`,
        });
      }),
    );
  }

  // ==========================================
  // ✅ فلتر حسب اسم الدكتور المرسل
  // ==========================================
  if (queryDto.fromDoctorName) {
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where('fromDoctorUser.firstName ILike :fromDoctorName', {
          fromDoctorName: `%${queryDto.fromDoctorName}%`,
        }).orWhere('fromDoctorUser.lastName ILike :fromDoctorName', {
          fromDoctorName: `%${queryDto.fromDoctorName}%`,
        });
      }),
    );
  }

  // ==========================================
  // ✅ البحث العام (Search)
  // ==========================================
  if (queryDto.search) {
    const search = `%${queryDto.search}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where('patientUser.firstName ILike :search', { search })
          .orWhere('patientUser.lastName ILike :search', { search })
          .orWhere('patientUser.phone ILike :search', { search })
          .orWhere('patientUser.email ILike :search', { search })
          .orWhere('fromDoctorUser.firstName ILike :search', { search })
          .orWhere('fromDoctorUser.lastName ILike :search', { search })
          .orWhere('toDoctorUser.firstName ILike :search', { search })
          .orWhere('toDoctorUser.lastName ILike :search', { search })
          .orWhere('toClinic.name ILike :search', { search })
          .orWhere('referral.reason ILike :search', { search });
      }),
    );
  }

  queryBuilder.orderBy('referral.created_at', 'DESC').skip(skip).take(limit);

  const [data, total] = await queryBuilder.getManyAndCount();
  const totalPages = Math.ceil(total / limit);

  return { data, meta: { total, page, limit, totalPages } };
}

  async findOne(id: number): Promise<Referral> {
    const referral = await this.referralRepository.findOne({
      where: { id },
      relations: [
        'patient',
        'fromDoctor',
        'toDoctor',
        'toClinic',
        'appointment',
      ],
    });
    if (!referral) {
      throw new NotFoundException('Referral not found');
    }
    return referral;
  }

  async cancelReferralByAdmin(
    id: number,
    dto: CancelReferralDto,
  ): Promise<Referral> {
    const referral = await this.referralRepository.findOne({
      where: { id },
      relations: ['patient'],
    });
    if (!referral) {
      throw new NotFoundException('Referral not found');
    }

    if (referral.status === ReferralStatus.COMPLETED) {
      throw new BadRequestException(
        'Cannot cancel an already completed referral',
      );
    }
    if (referral.status === ReferralStatus.EXPIRED) {
      throw new BadRequestException(
        'This referral is already expired or canceled',
      );
    }

    referral.status = ReferralStatus.EXPIRED;
    referral.cancellationReason = dto.cancellationReason.trim();
    referral.cancelledAt = nowDate();

    const updatedReferral = await this.referralRepository.save(referral);

    if (referral.patient?.userId) {
      await this.eventEmitter.emitAsync(
        ReferralCancelledEvent.eventName,
        new ReferralCancelledEvent({
          userId: referral.patient.userId,
          referralId: updatedReferral.id,
        }),
      );
    }

    return updatedReferral;
  }

  // ==========================================
  // 4. اللوجيك الخاص المتقدم (Special Business Logic)
  // ==========================================

  async validateReferralForBooking(
    referralId: number,
    patientId: number,
    targetDoctorId: number,
    targetClinicId: number,
  ): Promise<Referral> {
    const referral = await this.referralRepository.findOne({
      where: { id: referralId },
    });
    if (!referral) {
      throw new NotFoundException('Referral not found');
    }

    if (referral.patientId !== patientId) {
      throw new ForbiddenException('Unauthorized referral usage');
    }

    if (referral.status !== ReferralStatus.PENDING) {
      throw new BadRequestException(
        'This referral is no longer active or has already been used',
      );
    }

    if (referral.expiresAt && referral.expiresAt < nowDate()) {
      throw new BadRequestException('This referral has expired');
    }

    if (referral.type === ReferralType.FOLLOW_UP) {
      if (targetDoctorId !== referral.fromDoctorId) {
        throw new BadRequestException(
          'Booking details do not match referral constraints',
        );
      }
    } else if (referral.type === ReferralType.EXTERNAL) {
      if (referral.toDoctorId && targetDoctorId !== referral.toDoctorId) {
        throw new BadRequestException(
          'Booking details do not match referral constraints',
        );
      }
      if (referral.toClinicId && targetClinicId !== referral.toClinicId) {
        throw new BadRequestException(
          'Booking details do not match referral constraints',
        );
      }
    }

    return referral;
  }

  async consumeReferral(
    referralId: number,
    appointmentId: number,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(Referral)
      : this.referralRepository;

    if (!appointmentId) {
      throw new BadRequestException('Valid appointment ID is required');
    }

    const referral = await repo.findOne({
      where: { id: referralId },
      ...(manager ? { lock: { mode: 'pessimistic_write' } } : {}),
    });

    if (!referral) {
      throw new NotFoundException('Referral not found');
    }

    if (referral.status !== ReferralStatus.PENDING) {
      throw new BadRequestException('This referral has already been consumed');
    }

    referral.status = ReferralStatus.COMPLETED;
    referral.appointmentId = appointmentId;

    await repo.save(referral);
  }

  // ==========================================
  // 5. المهام التلقائية (Automation / Cron Jobs)
  // ==========================================

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredReferrals(): Promise<void> {
    const now = nowDate();
    const logger = new Logger('ReferralsCron');
    logger.log('Starting cron job to clean up expired referrals...');

    const result = await this.referralRepository
      .createQueryBuilder()
      .update(Referral)
      .set({ status: ReferralStatus.EXPIRED })
      .where('status = :pendingStatus', {
        pendingStatus: ReferralStatus.PENDING,
      })
      .andWhere('expiresAt IS NOT NULL AND expiresAt < :now', { now })
      .execute();

    const affectedRows = result.affected ?? 0;
    logger.log(
      `Expired referrals cleanup executed successfully. Affected rows: ${affectedRows}`,
    );
  }

  @Cron('0 9 * * 1')
  async sendReferralReminders(): Promise<void> {
    const logger = new Logger('ReferralRemindersCron');
    logger.log('Starting weekly referral reminders cron job...');

    const now = nowDate();
    const threeDaysFromNow = endOfDay(addDays(now, 3));

    const expiringReferrals = await this.referralRepository
      .createQueryBuilder('referral')
      .leftJoinAndSelect('referral.patient', 'patient')
      .leftJoinAndSelect('patient.user', 'patientUser')
      .leftJoinAndSelect('referral.toClinic', 'toClinic')
      .leftJoinAndSelect('referral.toDoctor', 'toDoctor')
      .leftJoinAndSelect('toDoctor.user', 'toDoctorUser')
      .where('referral.status = :status', { status: ReferralStatus.PENDING })
      .andWhere('referral.expiresAt IS NOT NULL')
      .andWhere(
        'referral.expiresAt > :now AND referral.expiresAt <= :threshold',
        {
          now,
          threshold: threeDaysFromNow,
        },
      )
      .getMany();

    if (expiringReferrals.length === 0) {
      logger.log('No expiring referrals found for reminders this week.');
      return;
    }

    logger.log(
      `Found ${expiringReferrals.length} referrals expiring soon. Emitting events...`,
    );

    for (const referral of expiringReferrals) {
      try {
        const patientName = referral.patient?.user?.firstName || 'عزيزي المريض';
        const destination = referral.toClinic?.name
          ? `عيادة ${referral.toClinic.name}`
          : referral.toDoctor?.user
            ? `الدكتور ${referral.toDoctor.user.firstName}`
            : 'العيادة المختصة';

        await this.eventEmitter.emitAsync(
          ReferralExpiringEvent.eventName,
          new ReferralExpiringEvent({
            userId: referral.patient.userId,
            referralId: referral.id,
            expiresAt: referral.expiresAt?.toISOString() ?? null,
            doctorName: referral.toDoctor?.user
              ? `${referral.toDoctor.user.firstName} ${referral.toDoctor.user.lastName ?? ''}`.trim()
              : null,
            clinicName: referral.toClinic?.name ?? null,
          }),
        );

        logger.log(
          `Reminder event emitted successfully for patient ID: ${referral.patientId} (${patientName} -> ${destination})`,
        );
      } catch (error: unknown) {
        const { message, stack } = this.getErrorMessage(error);
        logger.error(
          `Failed to send referral reminder for referral ID ${referral.id} to patient ID ${referral.patientId}: ${message}`,
          stack,
        );
      }
    }
  }

  // ==========================================
  // 6. الميثودز المساعدة (Helper Methods)
  // ==========================================

  private async calculateExpirationDate(type: ReferralType): Promise<Date> {
    const now = nowDate();

    const settings = await this.dataSource
      .getRepository(SystemSetting)
      .findOne({
        where: { id: 1 },
      });

    const followUpDays = settings?.referralFollowUpExpirationDays ?? 14;
    const externalDays = settings?.referralExternalExpirationDays ?? 30;

    let expirationDate = now;
    if (type === ReferralType.FOLLOW_UP) {
      expirationDate = addDays(now, followUpDays);
    } else if (type === ReferralType.EXTERNAL) {
      expirationDate = addDays(now, externalDays);
    }

    return endOfDay(expirationDate);
  }

  private getErrorMessage(error: unknown): { message: string; stack?: string } {
    if (error instanceof Error) {
      return { message: error.message, stack: error.stack };
    }
    return { message: String(error) };
  }

  private async validateReferralTargets(
    toClinicId: number | null,
    toDoctorId: number | null,
  ): Promise<void> {
    if (!toClinicId && !toDoctorId) {
      throw new BadRequestException(
        'A referral must target at least a clinic or a specific doctor',
      );
    }

    if (toClinicId) {
      const clinic = await this.dataSource
        .getRepository(Clinic)
        .findOne({ where: { id: toClinicId } });
      if (!clinic) throw new NotFoundException('Target clinic not found');
    }

    if (toDoctorId) {
      const doctor = await this.doctorRepository.findOne({
        where: { id: toDoctorId },
      });
      if (!doctor) throw new NotFoundException('Target doctor not found');
    }

    if (toClinicId && toDoctorId) {
      const isDoctorInClinic = await this.dataSource
        .getRepository(DoctorClinic)
        .findOne({
          where: { doctorId: toDoctorId, clinicId: toClinicId },
        });
      if (!isDoctorInClinic) {
        throw new BadRequestException(
          'The selected doctor does not practice in the specified clinic',
        );
      }
    }
  }
}
