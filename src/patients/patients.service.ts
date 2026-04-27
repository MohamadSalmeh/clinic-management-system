// patients.service.ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientProfile } from './entities/patient-profile.entity';
import { CreatePatientProfileDto, UpdatePatientDto } from './dto';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(PatientProfile)
    private readonly patientProfileRepository: Repository<PatientProfile>,
  ) {}

  async createProfile(userId: number, createDto: CreatePatientProfileDto): Promise<PatientProfile> {
    const existingProfile = await this.patientProfileRepository.findOne({
      where: { userId },
    });

    if (existingProfile) {
      throw new ConflictException('Patient profile already exists for this user');
    }

    const patientProfile = this.patientProfileRepository.create({
      userId,
      maritalStatus: createDto.maritalStatus,
      occupation: createDto.occupation,
      emergencyContactName: createDto.emergencyContactName,
      emergencyContactPhone: createDto.emergencyContactPhone,
    });

    await this.patientProfileRepository.save(patientProfile);

    return this.getProfile(userId);
  }

  async getProfile(userId: number): Promise<PatientProfile> {
    const patientProfile = await this.patientProfileRepository.findOne({
      where: { userId },
      relations: {
        user: true,
        medicalProfile: true,
        appointments: true,
        ratings: true,
      },
    });

    if (!patientProfile) {
      throw new NotFoundException('Patient profile not found');
    }

    return patientProfile;
  }

  async updateProfile(
    userId: number,
    updateDto: UpdatePatientDto,
  ): Promise<PatientProfile> {
    const patientProfile = await this.patientProfileRepository.findOne({
      where: { userId },
    });

    if (!patientProfile) {
      throw new NotFoundException('Patient profile not found');
    }

    if (updateDto.maritalStatus !== undefined) {
      patientProfile.maritalStatus = updateDto.maritalStatus;
    }

    if (updateDto.occupation !== undefined) {
      patientProfile.occupation = updateDto.occupation;
    }

    if (updateDto.emergencyContactName !== undefined) {
      patientProfile.emergencyContactName = updateDto.emergencyContactName;
    }

    if (updateDto.emergencyContactPhone !== undefined) {
      patientProfile.emergencyContactPhone = updateDto.emergencyContactPhone;
    }

    await this.patientProfileRepository.save(patientProfile);

    return this.getProfile(userId);
  }
}