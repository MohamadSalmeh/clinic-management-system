import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { toDateString } from '../common/utils/date-utils';
import { AdminPatientMedicalDetails } from './interfaces/admin-patient.interface';

import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { User } from '../users/entities/user.entity';
import { MedicalProfile } from '../medical-profiles/entities/medical-profile.entity';
import { MedicalHistory } from '../medical-histories/entities/medical-history.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { Clinic } from '../clinics/entities/clinic.entity';

@Injectable()
export class AdminPatientsService {
  private readonly logger = new Logger(AdminPatientsService.name);

  constructor(
    @InjectRepository(PatientProfile)
    private readonly patientProfileRepository: Repository<PatientProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MedicalProfile)
    private readonly medicalProfileRepository: Repository<MedicalProfile>,
    @InjectRepository(MedicalHistory)
    private readonly medicalHistoryRepository: Repository<MedicalHistory>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepository: Repository<DoctorProfile>,
    @InjectRepository(Clinic)
    private readonly clinicRepository: Repository<Clinic>,
  ) {}

  /**
   * Returns comprehensive patient medical details.
   */
  public async getPatientMedicalDetails(patientId: number): Promise<AdminPatientMedicalDetails> {
    try {
      // 1. جلب بيانات المريض
      const patient = await this.patientProfileRepository
        .createQueryBuilder('patient')
        .leftJoinAndSelect('patient.user', 'user')
        .leftJoinAndSelect('patient.medicalProfile', 'medicalProfile')
        .where('patient.id = :patientId', { patientId })
        .getOne();

      if (!patient) {
        throw new NotFoundException(`Patient profile #${patientId} not found`);
      }

      // 2. جلب الـ MedicalHistory مع العلاقات الصحيحة
      const medicalHistories = await this.medicalHistoryRepository
        .createQueryBuilder('history')
        .leftJoinAndSelect('history.doctorProfile', 'doctor')
        .leftJoinAndSelect('doctor.user', 'doctorUser')
        .leftJoinAndSelect('history.appointment', 'appointment')
        .leftJoinAndSelect('appointment.clinic', 'clinic')
        .leftJoinAndSelect('history.medicines', 'medicines')
        .where('history.medicalProfileId = :medicalProfileId', {
          medicalProfileId: patient.medicalProfile?.id ?? patientId,
        })
        .orderBy('history.created_at', 'DESC')  // ✅ تم التصحيح: createdAt → created_at
        .getMany();

      // 3. جلب الـ Appointments
      const appointments = await this.appointmentRepository
        .createQueryBuilder('appointment')
        .leftJoinAndSelect('appointment.clinic', 'clinic')
        .leftJoinAndSelect('appointment.doctor', 'doctor')
        .leftJoinAndSelect('doctor.user', 'doctorUser')
        .where('appointment.patientId = :patientId', { patientId })
        .orderBy('appointment.requestedDate', 'DESC')
        .getMany();

      // 4. إعادة البيانات
      return {
        patientProfile: patient as any,
        user: patient.user as any,
        medicalProfile: patient.medicalProfile as any,
        medicalHistory: medicalHistories.map((history: any) => ({
          id: history.id,
          doctor: history.doctor ? {
            ...history.doctor,
            user: history.doctor.user ?? null
          } : null,
          clinic: history.appointment?.clinic ?? null,
          prescribedMedicines: history.medicines ?? [],
          createdAt: history.createdAt ? toDateString(new Date(history.createdAt)) : null,
          updatedAt: history.updatedAt ? toDateString(new Date(history.updatedAt)) : null,
        })),
        appointments: appointments.map((appointment: any) => ({
          id: appointment.id,
          requestedDate: appointment.requestedDate ? toDateString(new Date(appointment.requestedDate)) : null,
          status: appointment.status ?? null,
          clinic: appointment.clinic ?? null,
          doctor: appointment.doctor ? {
            ...appointment.doctor,
            user: appointment.doctor.user ?? null
          } : null,
        })),
      };
    } catch (error) {
      this.logger.error('Failed to load patient medical details', error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }
}