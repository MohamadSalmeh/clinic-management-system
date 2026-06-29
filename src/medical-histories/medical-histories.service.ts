import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Appointment } from '../appointments/entities/appointment.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { MedicalProfile } from '../medical-profiles/entities/medical-profile.entity';
import { PatientProfile } from '../patients/entities/patient-profile.entity';

import { MedicalHistory } from './entities/medical-history.entity';
import { CreateMedicalHistoryDto } from './dto/create-medical-history.dto';

import { ActiveUserData } from '../utils';
import { AppointmentAccessService } from '../appointment-access/appointment-access.service';
import { MedicalHistoryCreatedEvent } from '../notifications/events';
const MEDICAL_RECORD_EDIT_WINDOW_DAYS = 7;

@Injectable()
export class MedicalHistoriesService {
    constructor(
        @InjectRepository(MedicalHistory)
        private readonly medicalHistoryRepository: Repository<MedicalHistory>,

        @InjectRepository(Appointment)
        private readonly appointmentRepository: Repository<Appointment>,

        @InjectRepository(DoctorProfile)
        private readonly doctorRepository: Repository<DoctorProfile>,

        @InjectRepository(PatientProfile)
        private readonly patientRepository: Repository<PatientProfile>,

        @InjectRepository(MedicalProfile)
        private readonly medicalProfileRepository: Repository<MedicalProfile>,
        private readonly appointmentAccessService: AppointmentAccessService,
        private readonly eventEmitter: EventEmitter2,
    ) { }
    async create(
        currentUser: ActiveUserData,

        dto: CreateMedicalHistoryDto,
    ): Promise<MedicalHistory> {
        /* const doctor = await this.doctorRepository.findOne({
                 where: {
                     userId: currentUser.sub,
                 },
             });
     
             if (!doctor) {
                 throw new NotFoundException('Doctor not found');
             }
     
             const appointment = await this.appointmentRepository.findOne({
                 where: {
                     id: dto.appointmentId,
                 },
     
                 relations: {
                     patient: true,
                 },
             });
     
             if (!appointment) {
                 throw new NotFoundException('Appointment not found');
             }
     
             if (Number(appointment.doctorId) !== Number(doctor.id)) {
                 throw new BadRequestException('This appointment does not belong to you');
             }
             const appointmentDate = new Date(appointment.requestedDate);
             const expiryDate = new Date(appointmentDate);
     
             expiryDate.setDate(
                 expiryDate.getDate() + MEDICAL_RECORD_EDIT_WINDOW_DAYS,
             );
     
             if (new Date() > expiryDate) {
                 throw new BadRequestException(
                     'Medical history creation window has expired',
                 );
             }*/
        const { appointment, doctorProfile } =
            await this.appointmentAccessService.validateDoctorAppointmentAccess(
                dto.appointmentId,
                currentUser.sub,
            );

        if (appointment.status === 'cancelled') {
            throw new BadRequestException('Cancelled appointments cannot be used');
        }

        const existing = await this.medicalHistoryRepository.findOne({
            where: {
                appointmentId: appointment.id,
            },
        });

        if (existing) {
            throw new BadRequestException('Medical history already exists');
        }

        const medicalProfile = await this.medicalProfileRepository.findOne({
            where: {
                patientProfileId: appointment.patientId,
            },
        });

        if (!medicalProfile) {
            throw new NotFoundException('Medical profile not found');
        }

        const history = this.medicalHistoryRepository.create({
            medicalProfileId: medicalProfile.id,

            appointmentId: appointment.id,

            doctorProfileId: doctorProfile.id,

            diagnosis: dto.diagnosis,

            treatmentPlan: dto.treatmentPlan,

            doctorNotes: dto.doctorNotes,
        });

        const savedHistory = await this.medicalHistoryRepository.save(history);
        const patient = await this.patientRepository.findOne({
            where: { id: appointment.patientId },
        });

        if (patient?.userId) {
            const doctor = await this.doctorRepository.findOne({
                where: { id: doctorProfile.id },
                relations: { user: true },
            });

            await this.eventEmitter.emitAsync(
                MedicalHistoryCreatedEvent.eventName,
                new MedicalHistoryCreatedEvent({
                    userId: patient.userId,
                    medicalHistoryId: savedHistory.id,
                    appointmentId: appointment.id,
                    doctorName: doctor?.user
                        ? `${doctor.user.firstName} ${doctor.user.lastName ?? ''}`.trim()
                        : null,
                }),
            );
        }

        return savedHistory;
    }
    async getMyMedicalHistories(
        currentUser: ActiveUserData,
        page = 1,
        limit = 20,
    ) {
        const patient = await this.patientRepository.findOne({
            where: {
                userId: currentUser.sub,
            },
        });

        if (!patient) {
            throw new NotFoundException('Patient profile not found');
        }

        const medicalProfile = await this.medicalProfileRepository.findOne({
            where: {
                patientProfileId: patient.id,
            },
        });

        if (!medicalProfile) {
            throw new NotFoundException('Medical profile not found');
        }

        const [items, total] = await this.medicalHistoryRepository.findAndCount({
            where: {
                medicalProfileId: medicalProfile.id,
            },

            order: {
                created_at: 'DESC',
            },

            skip: (page - 1) * limit,

            take: limit,

            relations: {
                doctorProfile: true,
                appointment: true,
            },
        });

        return {
            data: items,

            total,

            page,

            limit,

            totalPages: Math.ceil(total / limit),
        };
    }
    async getPatientMedicalHistory(
        appointmentId: number,
        currentUser: ActiveUserData,
    ): Promise<MedicalHistory[]> {

        const medicalProfile =
            await this.appointmentAccessService.getMedicalProfileByAppointment(
                appointmentId,
                currentUser.sub,
            );

        return this.medicalHistoryRepository.find({
            where: {
                medicalProfileId: medicalProfile.id,
            },

            order: {
                created_at: 'DESC',
            },

            relations: {
                appointment: true,
                doctorProfile: true,
                medicines: true,
                attachments: true,
            },
        });
    }
}
