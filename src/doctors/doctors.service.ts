import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { UpdateDoctorProfileDto, UpdateDoctorStatusDto } from './dto';
import { DoctorProfile } from './entities/doctor-profile.entity';
import { User } from '../users/entities/user.entity';
import { DoctorProfileStatus } from '../users/enums/doctor-profile-status.enum';
import { DoctorAdminLogsService } from './doctor-admin-logs.service';
import { DoctorAdminLogType } from './entities/doctor-admin-log.entity';
import {
  toDateOnly,
  toDateString,
  todayDateString,
} from '../common/utils/date-utils'; // ✅ إضافة الاستيراد
import { Appointment } from '../appointments/entities/appointment.entity';

import { Queue } from '../queues/entities/queue.entity';

import { QueueStatus } from '../queues/enums/queue-status.enum';
export type DoctorProfileCompletionStatus = {
  isComplete: boolean;
  completionPercentage: number;
  missingFields: string[];
};

export type DoctorSearchQuery = {
  mainSpecializationId?: string;
  specialization?: string;
  subSpecializationId?: string;
  subSpecialization?: string;
  clinicId?: string;
  search?: string;

  /**
   * Filter doctors by one of their spoken languages.
   * Example: Arabic
   */
  language?: string;

  /**
   * Sort doctors by:
   * - experienceYears
   * - averageRating
   */
  sortBy?: 'experienceYears' | 'averageRating';

  /**
   * Sort direction:
   * - asc
   * - desc
   */
  sortOrder?: 'asc' | 'desc';
};
export type AdminDoctorsQuery = {
  page?: string;
  limit?: string;
  search?: string;
  status?: DoctorProfileStatus;
  clinicId?: string;
  specialization?: string;
};
export type AdminDoctorListItem = DoctorProfile & {
  profileCompletion: DoctorProfileCompletionStatus;
};

@Injectable()
export class DoctorsService {
  private readonly logger = new Logger(DoctorsService.name);

  constructor(
    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepository: Repository<DoctorProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly doctorAdminLogsService: DoctorAdminLogsService,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,

    @InjectRepository(Queue)
    private readonly queueRepository: Repository<Queue>,
  ) {}

  async updateProfile(
    userId: number,
    dto: UpdateDoctorProfileDto,
  ): Promise<{
    profile: DoctorProfile;
    completionStatus: DoctorProfileCompletionStatus;
  }> {
    const profile = await this.doctorProfileRepository.findOne({
      where: { userId },
      relations: { user: true },
    });

    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }

    const oldInitialVisitFee = profile.initialVisitFee;
    const oldReturnVisitFee = profile.returnVisitFee;

    if (dto.gender !== undefined && profile.user) {
      profile.user.gender = dto.gender;
    }

    // ✅ التعديل: استبدال new Date بـ toDateOnly
    if (dto.birthDate !== undefined && profile.user) {
      profile.user.birthDate = toDateOnly(dto.birthDate);
    }

    if (dto.specialization !== undefined) {
      profile.specialization = dto.specialization;
    }

    if (dto.subSpecialization !== undefined) {
      profile.subSpecialization = dto.subSpecialization;
    }

    if (dto.licenseNumber !== undefined) {
      profile.licenseNumber = dto.licenseNumber;
    }

    if (dto.experienceYears !== undefined) {
      profile.experienceYears = dto.experienceYears;
    }

    if (dto.bio !== undefined) {
      profile.bio = dto.bio;
    }

    if (dto.initialVisitFee !== undefined) {
      profile.initialVisitFee = dto.initialVisitFee;
    }

    if (dto.returnVisitFee !== undefined) {
      profile.returnVisitFee = dto.returnVisitFee;
    }

    if (dto.languagesSpoken !== undefined) {
      profile.languagesSpoken = dto.languagesSpoken;
    }

    try {
      if (
        profile.user &&
        (dto.gender !== undefined || dto.birthDate !== undefined)
      ) {
        await this.userRepository.save(profile.user);
      }

      await this.doctorProfileRepository.save(profile);
      const updatedProfile = await this.doctorProfileRepository.findOne({
        where: { userId },
        relations: { user: true },
      });

      if (!updatedProfile) {
        throw new NotFoundException('Doctor profile not found');
      }

      if (
        dto.initialVisitFee !== undefined &&
        dto.initialVisitFee !== oldInitialVisitFee
      ) {
        await this.doctorAdminLogsService.createLog(
          updatedProfile.id,
          DoctorAdminLogType.FEE_UPDATE,
          'initialVisitFee',
          oldInitialVisitFee ?? null,
          dto.initialVisitFee,
          userId,
          null,
        );
      }

      if (
        dto.returnVisitFee !== undefined &&
        dto.returnVisitFee !== oldReturnVisitFee
      ) {
        await this.doctorAdminLogsService.createLog(
          updatedProfile.id,
          DoctorAdminLogType.FEE_UPDATE,
          'returnVisitFee',
          oldReturnVisitFee ?? null,
          dto.returnVisitFee,
          userId,
          null,
        );
      }

      return {
        profile: updatedProfile,
        completionStatus: this.buildCompletionStatus(updatedProfile),
      };
    } catch (error) {
      this.logger.error(
        'Failed to update doctor profile',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findMe(
    userId: number,
  ): Promise<{
    profile: DoctorProfile;
    completionStatus: DoctorProfileCompletionStatus;
  }> {
    const profile = await this.doctorProfileRepository.findOne({
      where: { userId },
      relations: { user: true },
    });

    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }

    return {
      profile,
      completionStatus: this.buildCompletionStatus(profile),
    };
  }

  async findOne(id: number): Promise<DoctorProfile> {
    const profile = await this.doctorProfileRepository.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }

    return profile;
  }

  async findAll(query: DoctorSearchQuery): Promise<DoctorProfile[]> {
    const qb = this.doctorProfileRepository
      .createQueryBuilder('doctor')
      .leftJoinAndSelect('doctor.user', 'user')
      .where('doctor.status = :status', {
        status: DoctorProfileStatus.ACTIVE,
      })
      .andWhere('doctor.isApproved = :isApproved', {
        isApproved: true,
      });

    // ============================================================
    // SPECIALIZATION
    // ============================================================

    const specialization = query.specialization ?? query.mainSpecializationId;

    if (specialization) {
      qb.andWhere('doctor.specialization = :specialization', {
        specialization,
      });
    }

    // ============================================================
    // SUB-SPECIALIZATION
    // ============================================================

    const subSpecialization =
      query.subSpecialization ?? query.subSpecializationId;

    if (subSpecialization) {
      qb.andWhere('doctor.subSpecialization = :subSpecialization', {
        subSpecialization,
      });
    }

    // ============================================================
    // CLINIC
    // ============================================================

    const clinicId = this.parseOptionalNumber(query.clinicId);

    if (clinicId !== undefined) {
      qb.innerJoin('doctor.clinicAssignments', 'clinicAssignment').andWhere(
        'clinicAssignment.clinicId = :clinicId',
        { clinicId },
      );
    }

    // ============================================================
    // SEARCH
    // ============================================================

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;

      qb.andWhere(
        new Brackets((builder) => {
          builder
            .where('user.firstName ILike :search', { search })
            .orWhere('user.lastName ILike :search', { search })
            .orWhere('user.fatherName ILike :search', { search })
            .orWhere('doctor.bio ILike :search', { search })
            .orWhere('doctor.licenseNumber ILike :search', { search });
        }),
      );
    }

    // ============================================================
    // LANGUAGE FILTER
    // ============================================================
    //
    // languagesSpoken is stored as JSON.
    // We check whether the requested language exists
    // inside the JSON array.
    //
    // Example:
    // ?language=Arabic
    //
    // ============================================================

    if (query.language?.trim()) {
      const language = query.language.trim();

      qb.andWhere(
        `
          EXISTS (
            SELECT 1
            FROM json_array_elements_text(doctor.languages_spoken) AS spoken_language
            WHERE LOWER(spoken_language) = LOWER(:language)
          )
        `,
        { language },
      );
    }

    // ============================================================
    // SORTING
    // ============================================================

    const allowedSortFields = {
      experienceYears: 'doctor.experienceYears',
      averageRating: 'doctor.averageRating',
    } as const;

    const sortField =
      query.sortBy && allowedSortFields[query.sortBy]
        ? allowedSortFields[query.sortBy]
        : null;

    const sortOrder = query.sortOrder?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    if (sortField) {
      qb.orderBy(sortField, sortOrder, 'NULLS LAST').addOrderBy(
        'doctor.id',
        'DESC',
      );
    } else {
      qb.orderBy('doctor.id', 'DESC');
    }

    return qb.getMany();
  }

  private buildCompletionStatus(
    doctorProfile: DoctorProfile,
  ): DoctorProfileCompletionStatus {
    const missingFields: string[] = [];
    const user = doctorProfile.user;

    if (!user?.birthDate) {
      missingFields.push('birthDate');
    }

    if (!user?.gender) {
      missingFields.push('gender');
    }

    if (
      !doctorProfile.licenseNumber ||
      doctorProfile.licenseNumber.trim().length === 0
    ) {
      missingFields.push('syndicateNumber');
    }

    if (
      !doctorProfile.specialization ||
      doctorProfile.specialization.trim().length === 0
    ) {
      missingFields.push('medicalSpecialty');
    }

    if (
      !doctorProfile.subSpecialization ||
      doctorProfile.subSpecialization.trim().length === 0
    ) {
      missingFields.push('medicalSubSpecialty');
    }

    const completionPercentage = ((5 - missingFields.length) / 5) * 100;

    return {
      isComplete: missingFields.length === 0,
      completionPercentage,
      missingFields,
    };
  }

  private parseOptionalNumber(value?: string): number | undefined {
    if (value === undefined || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  async findAllForAdmin(query: AdminDoctorsQuery): Promise<{
    data: AdminDoctorListItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(Number(query.page?.trim()) || 1, 1);

    const limit = Math.min(Math.max(Number(query.limit?.trim()) || 10, 1), 100);

    const status = query.status?.trim();
    const specialization = query.specialization?.trim();
    const clinicIdValue = query.clinicId?.trim();
    const searchTerm = query.search?.trim();

    const qb = this.doctorProfileRepository
      .createQueryBuilder('doctor')
      .leftJoinAndSelect('doctor.user', 'user');

    if (status) {
      qb.andWhere('doctor.status = :status', {
        status,
      });
    }

    if (specialization) {
      qb.andWhere('doctor.specialization ILike :specialization', {
        specialization: `%${specialization}%`,
      });
    }

    if (clinicIdValue) {
      const clinicId = Number(clinicIdValue);

      if (!Number.isNaN(clinicId)) {
        qb.innerJoin('doctor.clinicAssignments', 'clinicAssignment').andWhere(
          'clinicAssignment.clinicId = :clinicId',
          { clinicId },
        );
      }
    }

    if (searchTerm) {
      const search = `%${searchTerm}%`;

      qb.andWhere(
        new Brackets((builder) => {
          builder
            .where('user.firstName ILike :search', {
              search,
            })
            .orWhere('user.lastName ILike :search', {
              search,
            })
            .orWhere('user.fatherName ILike :search', {
              search,
            })
            .orWhere('user.email ILike :search', {
              search,
            })
            .orWhere('user.phone ILike :search', {
              search,
            })
            .orWhere('doctor.licenseNumber ILike :search', {
              search,
            })
            .orWhere('doctor.specialization ILike :search', {
              search,
            });
        }),
      );
    }

    qb.orderBy('doctor.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [doctors, total] = await qb.getManyAndCount();

    const data: AdminDoctorListItem[] = doctors.map((doctor) => {
      const adminDoctor = doctor as AdminDoctorListItem;

      adminDoctor.profileCompletion = this.buildCompletionStatus(doctor);

      return adminDoctor;
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }
  async getMyDashboard(userId: number): Promise<{
    doctor: {
      id: number;
      fullName: string;
      specialization: string | null;
      averageRating: number;
      avatarUrl: string | null;
    };
    stats: {
      appointmentsToday: number;
      appointmentsThisWeek: number;
      patientsWaiting: number;
      completedToday: number;
    };
    upcomingAppointments: Array<{
      id: number;
      patient: {
        id: number;
        fullName: string;
      };
      date: string;
      startTime: string;
      endTime: string;
      type: string;
      status: string;
    }>;
  }> {
    const doctorProfile = await this.doctorProfileRepository.findOne({
      where: {
        userId,
      },
      relations: {
        user: true,
      },
    });

    if (!doctorProfile) {
      throw new NotFoundException('Doctor profile not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayOfWeek = today.getDay();

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const todayString = todayDateString();
    const weekStartString = toDateString(weekStart);
    const weekEndString = toDateString(weekEnd);

    const appointmentsToday = await this.appointmentRepository
      .createQueryBuilder('appointment')
      .where('appointment.doctorId = :doctorId', {
        doctorId: doctorProfile.id,
      })
      .andWhere('appointment.requestedDate = :today', {
        today: todayString,
      })
      .andWhere('appointment.status != :cancelled', {
        cancelled: 'cancelled',
      })
      .getCount();

    const appointmentsThisWeek = await this.appointmentRepository
      .createQueryBuilder('appointment')
      .where('appointment.doctorId = :doctorId', {
        doctorId: doctorProfile.id,
      })
      .andWhere('appointment.requestedDate >= :weekStart', {
        weekStart: weekStartString,
      })
      .andWhere('appointment.requestedDate < :weekEnd', {
        weekEnd: weekEndString,
      })
      .andWhere('appointment.status != :cancelled', {
        cancelled: 'cancelled',
      })
      .getCount();

    const completedToday = await this.appointmentRepository
      .createQueryBuilder('appointment')
      .where('appointment.doctorId = :doctorId', {
        doctorId: doctorProfile.id,
      })
      .andWhere('appointment.requestedDate = :today', {
        today: todayString,
      })
      .andWhere('appointment.status = :completed', {
        completed: 'completed',
      })
      .getCount();
    /*
        const patientsWaiting = await this.queueRepository
          .createQueryBuilder('queue')
          .innerJoin(
            'queue.appointment',
            'appointment',
          )
          .where('queue.doctorId = :doctorId', {
            doctorId: doctorProfile.id,
          })
          .andWhere('queue.status = :status', {
            status: QueueStatus.WAITING,
          })
          .andWhere('appointment.requestedDate = :today', {
            today: todayString,
          })
          .getCount();
    */
    const patientsWaiting = await this.queueRepository
      .createQueryBuilder('queue')
      .innerJoin('queue.appointment', 'appointment')
      .where('queue.doctorId = :doctorId', {
        doctorId: doctorProfile.id,
      })
      .andWhere('queue.status = :status', {
        status: QueueStatus.WAITING,
      })
      .andWhere('appointment.requestedDate = :today', {
        today: todayString,
      })
      .andWhere('appointment.status != :cancelled', {
        cancelled: 'cancelled',
      })
      .getCount();
    const upcoming = await this.appointmentRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('patient.user', 'patientUser')
      .where('appointment.doctorId = :doctorId', {
        doctorId: doctorProfile.id,
      })
      .andWhere('appointment.status = :status', {
        status: 'confirmed',
      })
      .andWhere(
        `
      (
        appointment.requestedDate > :today
        OR (
          appointment.requestedDate = :today
          AND appointment.startTime > :currentTime
        )
      )
      `,
        {
          today: todayString,
          currentTime: `${String(new Date().getHours()).padStart(2, '0')}:${String(
            new Date().getMinutes(),
          ).padStart(2, '0')}:00`,
        },
      )
      .orderBy('appointment.requestedDate', 'ASC')
      .addOrderBy('appointment.startTime', 'ASC')
      .take(3)
      .getMany();

    return {
      doctor: {
        id: doctorProfile.id,
        fullName: doctorProfile.user.fullName,
        specialization: doctorProfile.specialization,
        averageRating: Number(doctorProfile.averageRating ?? 0),
        avatarUrl: doctorProfile.user.avatarUrl ?? null,
      },

      stats: {
        appointmentsToday,
        appointmentsThisWeek,
        patientsWaiting,
        completedToday,
      },

      upcomingAppointments: upcoming.map((appointment) => ({
        id: appointment.id,

        patient: {
          id: appointment.patient.id,
          fullName: appointment.patient.user.fullName,
        },

        date: toDateString(appointment.requestedDate),

        startTime: appointment.startTime.slice(0, 5),
        endTime: appointment.endTime.slice(0, 5),

        type: appointment.type,
        status: appointment.status,
      })),
    };
  }
  async updateDoctorStatus(
    doctorId: number,
    dto: UpdateDoctorStatusDto,
  ): Promise<DoctorProfile> {
    const doctorProfile = await this.doctorProfileRepository.findOne({
      where: { id: doctorId },
      relations: { user: true },
    });

    if (!doctorProfile) {
      throw new NotFoundException('Doctor profile not found');
    }

    doctorProfile.status = dto.status;

    return this.doctorProfileRepository.save(doctorProfile);
  }
}
