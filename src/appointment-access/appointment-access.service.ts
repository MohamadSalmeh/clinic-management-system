import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Appointment } from '../appointments/entities/appointment.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { MedicalHistory } from '../medical-histories/entities/medical-history.entity';
import { MedicalProfile } from '../medical-profiles/entities/medical-profile.entity';
const MEDICAL_RECORD_EDIT_WINDOW_DAYS = 7;

@Injectable()
export class AppointmentAccessService {

    constructor(

        @InjectRepository(Appointment)
        private readonly appointmentRepository: Repository<Appointment>,

        @InjectRepository(DoctorProfile)
        private readonly doctorRepository: Repository<DoctorProfile>,

        @InjectRepository(PatientProfile)
        private readonly patientRepository: Repository<PatientProfile>,

        @InjectRepository(MedicalProfile)
        private readonly medicalProfileRepository: Repository<MedicalProfile>,

    ) { }
    async validateDoctorAppointmentAccess(
        appointmentId: number,
        userId: number,
    ): Promise<{
        appointment: Appointment;
        doctorProfile: DoctorProfile;
    }> {

        const doctorProfile = await this.doctorRepository.findOne({
            where: {
                userId,
            },
        });

        if (!doctorProfile) {
            throw new NotFoundException('Doctor profile not found');
        }

        const appointment = await this.appointmentRepository.findOne({
            where: {
                id: appointmentId,
            },
        });

        if (!appointment) {
            throw new NotFoundException('Appointment not found');
        }

        if (appointment.status === 'cancelled') {
            throw new BadRequestException(
                'Cancelled appointments cannot be modified',
            );
        }

        if (appointment.doctorId !== doctorProfile.id) {
            throw new BadRequestException(
                'This appointment does not belong to you',
            );
        }

        const expiryDate = new Date(appointment.requestedDate);

        expiryDate.setDate(
            expiryDate.getDate() + MEDICAL_RECORD_EDIT_WINDOW_DAYS,
        );

        if (new Date() > expiryDate) {
            throw new BadRequestException(
                'Medical record edit window has expired',
            );
        }

        return {
            appointment,
            doctorProfile,
        };
    }
    async validateDoctorMedicalHistoryAccess(
        history: MedicalHistory,
        userId: number,
    ): Promise<{
        appointment: Appointment;
        doctorProfile: DoctorProfile;
    }> {
        return this.validateDoctorAppointmentAccess(
            history.appointmentId,
            userId,
        );
    }
    async getPatientByAppointment(
        appointmentId: number,
        doctorUserId: number,
    ): Promise<PatientProfile> {
        const { appointment } =
            await this.validateDoctorAppointmentAccess(
                appointmentId,
                doctorUserId,
            );

        const patient = await this.patientRepository.findOne({
            where: {
                id: appointment.patientId,
            },
        });

        if (!patient) {
            throw new NotFoundException('Patient profile not found');
        }

        return patient;
    }
    async getMedicalProfileByAppointment(
        appointmentId: number,
        doctorUserId: number,
    ): Promise<MedicalProfile> {
        const patient = await this.getPatientByAppointment(
            appointmentId,
            doctorUserId,
        );

        const medicalProfile = await this.medicalProfileRepository.findOne({
            where: {
                patientProfileId: patient.id,
            },
        });

        if (!medicalProfile) {
            throw new NotFoundException('Medical profile not found');
        }

        return medicalProfile;
    }
}