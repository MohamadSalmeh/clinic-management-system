import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import {
    InjectRepository,
} from '@nestjs/typeorm';

import {
    Repository,
} from 'typeorm';

import { Appointment } from '../appointments/entities/appointment.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { MedicalProfile } from '../medical-profiles/entities/medical-profile.entity';
import { PatientProfile } from '../patients/entities/patient-profile.entity';

import { MedicalHistory } from './entities/medical-history.entity';
import { CreateMedicalHistoryDto } from './dto/create-medical-history.dto';

import { ActiveUserData } from '../utils';
@Injectable()
export class MedicalHistoriesService {
    constructor(

        @InjectRepository(MedicalHistory)
        private readonly medicalHistoryRepository:
            Repository<MedicalHistory>,

        @InjectRepository(Appointment)
        private readonly appointmentRepository:
            Repository<Appointment>,

        @InjectRepository(DoctorProfile)
        private readonly doctorRepository:
            Repository<DoctorProfile>,

        @InjectRepository(PatientProfile)
        private readonly patientRepository:
            Repository<PatientProfile>,

        @InjectRepository(MedicalProfile)
        private readonly medicalProfileRepository:
            Repository<MedicalProfile>,

    ) { }
    async create(

        currentUser: ActiveUserData,

        dto: CreateMedicalHistoryDto,

    ): Promise<MedicalHistory> {

        const doctor =

            await this.doctorRepository.findOne({

                where: {

                    userId: currentUser.sub,

                },

            });

        if (!doctor) {

            throw new NotFoundException(
                'Doctor not found',
            );

        }

        const appointment =

            await this.appointmentRepository.findOne({

                where: {

                    id: dto.appointmentId,

                },

                relations: {

                    patient: true,

                },

            });

        if (!appointment) {

            throw new NotFoundException(
                'Appointment not found',
            );

        }

        if (

            Number(appointment.doctorId)

            !==

            Number(doctor.id)

        ) {

            throw new BadRequestException(
                'This appointment does not belong to you',
            );

        }

        if (

            appointment.status

            !==

            'completed'

        ) {

            throw new BadRequestException(
                'Medical history can only be created after completed appointment',
            );

        }

        const existing =

            await this.medicalHistoryRepository.findOne({

                where: {

                    appointmentId:
                        appointment.id,

                },

            });

        if (existing) {

            throw new BadRequestException(
                'Medical history already exists',
            );

        }

        const medicalProfile =

            await this.medicalProfileRepository.findOne({

                where: {

                    patientProfileId:
                        appointment.patientId,

                },

            });

        if (!medicalProfile) {

            throw new NotFoundException(
                'Medical profile not found',
            );

        }

        const history =

            this.medicalHistoryRepository.create({

                medicalProfileId:
                    medicalProfile.id,

                appointmentId:
                    appointment.id,

                doctorProfileId:
                    doctor.id,

                diagnosis:
                    dto.diagnosis,

                treatmentPlan:
                    dto.treatmentPlan,

                doctorNotes:
                    dto.doctorNotes,

                followUpNeeded:
                    dto.followUpNeeded,

                followUpDate:
                    dto.followUpDate
                        ? new Date(dto.followUpDate)
                        : null,

            });

        return this.medicalHistoryRepository.save(
            history,
        );

    }
}