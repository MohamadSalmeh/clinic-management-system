// patients.service.ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { MedicalProfile } from '../medical-profiles/entities/medical-profile.entity';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { PatientProfile } from './entities/patient-profile.entity';
import { CompletePatientProfileDto, CreatePatientProfileDto, UpdatePatientDto } from './dto';

export type PatientAppointmentFilter = 'upcoming' | 'completed' | 'cancelled';

export type PatientAppointmentsGrouped = {
  upcoming: Appointment[];
  completed: Appointment[];
  cancelled: Appointment[];
};

export type PatientProfileCompletionStatus = {
  isComplete: boolean;
  missingFields: string[];
};

export type PatientWalletSummary = {
  balance: string;
  frozenBalance: string;
  availableBalance: string;
};

const APPOINTMENT_STATUS_MAP: Record<PatientAppointmentFilter, readonly string[]> = {
  upcoming: ['confirmed'],
  completed: ['completed'],
  cancelled: ['cancelled', 'no_show'],
};

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(PatientProfile)
    private readonly patientProfileRepository: Repository<PatientProfile>,
    @InjectRepository(MedicalProfile)
    private readonly medicalProfileRepository: Repository<MedicalProfile>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
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

  

  

  async getWallet(userId: number): Promise<PatientWalletSummary | null> {
    const patientProfile = await this.patientProfileRepository.findOne({
      where: { userId },
    });

    if (!patientProfile) {
      throw new NotFoundException('Patient profile not found');
    }

    const wallet = await this.walletRepository.findOne({ where: { userId } });

    if (!wallet) {
      return null;
    }

    return {
      balance: wallet.balance,
      frozenBalance: wallet.lockedBalance,
      availableBalance: wallet.availableBalance,
    };
  }

  async getAppointments(
    userId: number,
    status?: PatientAppointmentFilter,
  ): Promise<Appointment[] | PatientAppointmentsGrouped> {
    const patientProfile = await this.patientProfileRepository.findOne({
      where: { userId },
    });

    if (!patientProfile) {
      throw new NotFoundException('Patient profile not found');
    }

    if (status) {
      return this.appointmentRepository.find({
        where: {
          patientId: patientProfile.id,
          status: In(APPOINTMENT_STATUS_MAP[status]),
        },
        order: {
          requestedDate: 'DESC',
          startTime: 'DESC',
        },
      });
    }

    const appointments = await this.appointmentRepository.find({
      where: { patientId: patientProfile.id },
      order: {
        requestedDate: 'DESC',
        startTime: 'DESC',
      },
    });

    return this.groupAppointments(appointments);
  }

  private buildCompletionStatus(
    patientProfile: PatientProfile,
  ): PatientProfileCompletionStatus {
    const missingFields: string[] = [];
    const medicalProfile = patientProfile.medicalProfile;

    if (!patientProfile.user?.birthDate) {
      missingFields.push('birthDate');
    }

    if (!medicalProfile?.bloodType) {
      missingFields.push('bloodType');
    }

    if (!medicalProfile || medicalProfile.allergies == null) {
      missingFields.push('allergies');
    }

    if (!medicalProfile || medicalProfile.chronicConditions == null) {
      missingFields.push('chronicDiseases');
    }

    return {
      isComplete: missingFields.length === 0,
      missingFields,
    };
  }

  private groupAppointments(appointments: Appointment[]): PatientAppointmentsGrouped {
    const grouped: PatientAppointmentsGrouped = {
      upcoming: [],
      completed: [],
      cancelled: [],
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
        case 'no_show':
          grouped.cancelled.push(appointment);
          break;
        default:
          grouped.cancelled.push(appointment);
          break;
      }
    }

    return grouped;
  }
}