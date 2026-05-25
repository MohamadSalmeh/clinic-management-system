import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { UpdateDoctorProfileDto } from './dto';
import { DoctorProfile } from './entities/doctor-profile.entity';
import { User } from '../users/entities/user.entity';
import { DoctorProfileStatus } from '../users/enums/doctor-profile-status.enum';

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
};

@Injectable()
export class DoctorsService {
  private readonly logger = new Logger(DoctorsService.name);

  constructor(
    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepository: Repository<DoctorProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async updateProfile(
    userId: number,
    dto: UpdateDoctorProfileDto,
  ): Promise<{ profile: DoctorProfile; completionStatus: DoctorProfileCompletionStatus }> {
    const profile = await this.doctorProfileRepository.findOne({
      where: { userId },
      relations: { user: true },
    });

    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }

    if (dto.gender !== undefined && profile.user) {
      profile.user.gender = dto.gender;
    }

    if (dto.birthDate !== undefined && profile.user) {
      profile.user.birthDate = new Date(dto.birthDate);
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

    if (dto.languagesSpoken !== undefined) {
      profile.languagesSpoken = dto.languagesSpoken;
    }

    try {
      if (profile.user && (dto.gender !== undefined || dto.birthDate !== undefined)) {
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
  ): Promise<{ profile: DoctorProfile; completionStatus: DoctorProfileCompletionStatus }> {
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
      .where('doctor.status = :status', { status: DoctorProfileStatus.ACTIVE })
      .andWhere('doctor.isApproved = :isApproved', { isApproved: true });

    const specialization = query.specialization ?? query.mainSpecializationId;
    if (specialization) {
      qb.andWhere('doctor.specialization = :specialization', { specialization });
    }

    const subSpecialization = query.subSpecialization ?? query.subSpecializationId;
    if (subSpecialization) {
      qb.andWhere('doctor.subSpecialization = :subSpecialization', { subSpecialization });
    }

    const clinicId = this.parseOptionalNumber(query.clinicId);
    if (clinicId !== undefined) {
      qb.innerJoin('doctor.clinicAssignments', 'clinicAssignment')
        .andWhere('clinicAssignment.clinicId = :clinicId', { clinicId });
    }

    if (query.search) {
      const search = `%${query.search}%`;
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

    if (!doctorProfile.licenseNumber || doctorProfile.licenseNumber.trim().length === 0) {
      missingFields.push('syndicateNumber');
    }

    if (!doctorProfile.specialization || doctorProfile.specialization.trim().length === 0) {
      missingFields.push('medicalSpecialty');
    }

    if (!doctorProfile.subSpecialization || doctorProfile.subSpecialization.trim().length === 0) {
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
}
