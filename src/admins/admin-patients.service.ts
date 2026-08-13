import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { toDateString } from '../common/utils/date-utils';
import {
  AdminPatientMedicalDetails,  // ✅ أضف هذا
  PatientBasicProfile,
  PatientAppointmentsResponse,
  PatientMedicalProfileResponse,
  PatientMedicalHistoriesResponse,
  PatientProfileLogsResponse,
} from './interfaces/admin-patient.interface';

import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { User } from '../users/entities/user.entity';
import { MedicalProfile } from '../medical-profiles/entities/medical-profile.entity';
import { MedicalHistory } from '../medical-histories/entities/medical-history.entity';
import { MedicalProfileLog } from '../medical-profile-logs/entities/medical-profile-log.entity';
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
    @InjectRepository(MedicalProfileLog)
    private readonly medicalProfileLogRepository: Repository<MedicalProfileLog>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepository: Repository<DoctorProfile>,
    @InjectRepository(Clinic)
    private readonly clinicRepository: Repository<Clinic>,
  ) {}

  // ============================================================
  // PHASE 2: Patient Medical Details (موجود مبارح)
  // ============================================================

  /**
   * Returns comprehensive patient medical details.
   */
  public async getPatientMedicalDetails(
    patientId: number,
  ): Promise<AdminPatientMedicalDetails> {
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
        .orderBy('history.created_at', 'DESC')
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
          doctor: history.doctor
            ? {
                ...history.doctor,
                user: history.doctor.user ?? null,
              }
            : null,
          clinic: history.appointment?.clinic ?? null,
          prescribedMedicines: history.medicines ?? [],
          createdAt: history.createdAt
            ? toDateString(new Date(history.createdAt))
            : null,
          updatedAt: history.updatedAt
            ? toDateString(new Date(history.updatedAt))
            : null,
        })),
        appointments: appointments.map((appointment: any) => ({
          id: appointment.id,
          requestedDate: appointment.requestedDate
            ? toDateString(new Date(appointment.requestedDate))
            : null,
          status: appointment.status ?? null,
          clinic: appointment.clinic ?? null,
          doctor: appointment.doctor
            ? {
                ...appointment.doctor,
                user: appointment.doctor.user ?? null,
              }
            : null,
        })),
      };
    } catch (error) {
      this.logger.error(
        'Failed to load patient medical details',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  // ============================================================
  // PHASE 3: Admin Patient Management Endpoints
  // ============================================================

  /**
   * Returns a patient's basic profile with user details.
   */
  public async getPatientBasicProfile(
    patientId: number,
  ): Promise<PatientBasicProfile> {
    try {
      const patient = await this.patientProfileRepository
        .createQueryBuilder('patient')
        .leftJoinAndSelect('patient.user', 'user')
        .where('patient.id = :patientId', { patientId })
        .getOne();

      if (!patient) {
        throw new NotFoundException(`Patient #${patientId} not found`);
      }

      return {
        patientProfile: patient,
        user: patient.user ?? null,
      };
    } catch (error) {
      this.logger.error(
        'Failed to load patient basic profile',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Returns all appointments for a patient.
   */
  public async getPatientAppointments(
    patientId: number,
  ): Promise<PatientAppointmentsResponse> {
    try {
      const patientExists = await this.patientProfileRepository.count({
        where: { id: patientId },
      });
      if (!patientExists) {
        throw new NotFoundException(`Patient #${patientId} not found`);
      }

      const appointments = await this.appointmentRepository
        .createQueryBuilder('appointment')
        .leftJoinAndSelect('appointment.doctor', 'doctor')
        .leftJoinAndSelect('doctor.user', 'doctorUser')
        .leftJoinAndSelect('appointment.clinic', 'clinic')
        .leftJoinAndSelect('appointment.payment', 'payment')
        .leftJoinAndSelect('appointment.queue', 'queue')
        .where('appointment.patientId = :patientId', { patientId })
        .orderBy('appointment.requestedDate', 'DESC')
        .addOrderBy('appointment.startTime', 'DESC')
        .getMany();

      return {
        appointments: appointments.map((appointment: any) => ({
          id: appointment.id,
          requestedDate: appointment.requestedDate
            ? toDateString(new Date(appointment.requestedDate))
            : null,
          startTime: appointment.startTime ?? null,
          endTime: appointment.endTime ?? null,
          type: appointment.type ?? null,
          priority: appointment.priority ?? null,
          status: appointment.status ?? null,
          reasonForVisit: appointment.reasonForVisit ?? null,
          doctor: appointment.doctor
            ? {
                id: appointment.doctor.id,
                fullName:
                  `${appointment.doctor.user?.firstName ?? ''} ${appointment.doctor.user?.lastName ?? ''}`.trim(),
                specialization: appointment.doctor.specialization ?? null,
              }
            : null,
          clinic: appointment.clinic ?? null,
          payment: appointment.payment ?? null,
          queue: appointment.queue ?? null,
        })),
      };
    } catch (error) {
      this.logger.error(
        'Failed to load patient appointments',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Returns the patient's medical profile.
   */
  public async getPatientMedicalProfile(
    patientId: number,
  ): Promise<PatientMedicalProfileResponse> {
    try {
      const patient = await this.patientProfileRepository
        .createQueryBuilder('patient')
        .leftJoinAndSelect('patient.medicalProfile', 'medicalProfile')
        .where('patient.id = :patientId', { patientId })
        .getOne();

      if (!patient) {
        throw new NotFoundException(`Patient #${patientId} not found`);
      }

      if (!patient.medicalProfile) {
        throw new NotFoundException(
          `Medical profile for patient #${patientId} not found`,
        );
      }

      return {
        medicalProfile: patient.medicalProfile,
      };
    } catch (error) {
      this.logger.error(
        'Failed to load patient medical profile',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Returns all medical history records for a patient.
   */
  public async getPatientMedicalHistories(
    patientId: number,
  ): Promise<PatientMedicalHistoriesResponse> {
    try {
      const patientExists = await this.patientProfileRepository.count({
        where: { id: patientId },
      });
      if (!patientExists) {
        throw new NotFoundException(`Patient #${patientId} not found`);
      }

      // جلب MedicalProfile أولاً
      const medicalProfile = await this.medicalProfileRepository.findOne({
        where: { patientProfileId: patientId },
      });

      if (!medicalProfile) {
        throw new NotFoundException(
          `Medical profile for patient #${patientId} not found`,
        );
      }

      // جلب الـ MedicalHistories مع العلاقات
      const histories = await this.medicalHistoryRepository
        .createQueryBuilder('medicalHistory')
        .leftJoinAndSelect('medicalHistory.appointment', 'appointment')
        .leftJoinAndSelect('medicalHistory.doctorProfile', 'doctor')
        .leftJoinAndSelect('doctor.user', 'doctorUser')
        .leftJoinAndSelect('medicalHistory.medicines', 'medicines')
        .leftJoinAndSelect('medicalHistory.attachments', 'attachments')
        .where('medicalHistory.medicalProfileId = :medicalProfileId', {
          medicalProfileId: medicalProfile.id,
        })
        .orderBy('medicalHistory.created_at', 'DESC')
        .getMany();

      return {
        medicalHistories: histories.map((history: any) => ({
          id: history.id,
          diagnosis: history.diagnosis ?? null,
          treatmentPlan: history.treatmentPlan ?? null,
          doctorNotes: history.doctorNotes ?? null,
          createdAt: history.created_at
            ? toDateString(new Date(history.created_at))
            : null,
          appointment: history.appointment ?? null,
          doctor: history.doctor
            ? {
                id: history.doctor.id,
                fullName:
                  `${history.doctor.user?.firstName ?? ''} ${history.doctor.user?.lastName ?? ''}`.trim(),
                specialization: history.doctor.specialization ?? null,
              }
            : null,
          medicines: history.medicines ?? [],
          attachments: (history.attachments ?? []).map((attachment: any) => ({
            id: attachment.id,
            originalName: attachment.originalName ?? null,
            fileType: attachment.fileType ?? null,
            fileSize: attachment.fileSize ?? null,
            createdAt: attachment.created_at
              ? toDateString(new Date(attachment.created_at))
              : null,
          })),
        })),
      };
    } catch (error) {
      this.logger.error(
        'Failed to load patient medical histories',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Returns all medical profile logs for a patient.
   */
  public async getPatientMedicalProfileLogs(
    patientId: number,
  ): Promise<PatientProfileLogsResponse> {
    try {
      const patient = await this.patientProfileRepository
        .createQueryBuilder('patient')
        .leftJoinAndSelect('patient.medicalProfile', 'medicalProfile')
        .where('patient.id = :patientId', { patientId })
        .getOne();

      if (!patient) {
        throw new NotFoundException(`Patient #${patientId} not found`);
      }

      if (!patient.medicalProfile) {
        throw new NotFoundException(
          `Medical profile for patient #${patientId} not found`,
        );
      }

      const logs = await this.medicalProfileLogRepository
        .createQueryBuilder('log')
        .leftJoinAndSelect('log.user', 'user')
        .where('log.medicalProfileId = :medicalProfileId', {
          medicalProfileId: patient.medicalProfile.id,
        })
        .orderBy('log.created_at', 'DESC')
        .getMany();

      return {
        logs: logs.map((log: any) => ({
          id: log.id,
          fieldName: log.fieldName ?? null,
          oldValue: log.oldValue ?? null,
          newValue: log.newValue ?? null,
          changeReason: log.changeReason ?? null,
          appointmentId: log.appointmentId ?? null,
          createdAt: log.created_at
            ? toDateString(new Date(log.created_at))
            : null,
          changedBy: log.user
            ? {
                id: log.user.id,
                firstName: log.user.firstName ?? '',
                lastName: log.user.lastName ?? '',
                role: log.user.role ?? '',
              }
            : null,
        })),
      };
    } catch (error) {
      this.logger.error(
        'Failed to load patient medical profile logs',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}