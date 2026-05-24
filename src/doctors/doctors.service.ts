import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateDoctorProfileDto } from './dto';
import { DoctorProfile } from './entities/doctor-profile.entity';
import { User } from '../users/entities/user.entity';

export type DoctorProfileCompletionStatus = {
  isComplete: boolean;
  completionPercentage: number;
  missingFields: string[];
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
}
