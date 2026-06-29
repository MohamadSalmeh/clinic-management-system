
import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';

import { PrescribedMedicine } from './entities/prescribed-medicine.entity';
import { MedicalHistory } from '../medical-histories/entities/medical-history.entity';
import { MedicalProfile } from '../medical-profiles/entities/medical-profile.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { PatientProfile } from '../patients/entities/patient-profile.entity';

import { AppointmentAccessService } from '../appointment-access/appointment-access.service';
import { ActiveUserData } from '../utils';
import { CreatePrescribedMedicineDto } from './dto/create-prescribed-medicine.dto';
import { UpdateMedicineStatusDto } from './dto/update-medicine-status.dto';

@Injectable()
export class PrescribedMedicinesService {

    constructor(

        @InjectRepository(PrescribedMedicine)
        private readonly medicineRepository: Repository<PrescribedMedicine>,

        @InjectRepository(MedicalHistory)
        private readonly medicalHistoryRepository: Repository<MedicalHistory>,

        @InjectRepository(MedicalProfile)
        private readonly medicalProfileRepository: Repository<MedicalProfile>,

        @InjectRepository(Appointment)
        private readonly appointmentRepository: Repository<Appointment>,

        @InjectRepository(DoctorProfile)
        private readonly doctorRepository: Repository<DoctorProfile>,

        @InjectRepository(PatientProfile)
        private readonly patientRepository: Repository<PatientProfile>,

        private readonly appointmentAccessService: AppointmentAccessService,

    ) { }
    async createHistoryMedicine(
        historyId: number,
        dto: CreatePrescribedMedicineDto,
        currentUser: ActiveUserData,
    ): Promise<PrescribedMedicine> {

        const history = await this.medicalHistoryRepository.findOne({
            where: {
                id: historyId,
            },
        });

        if (!history) {
            throw new NotFoundException('Medical history not found');
        }

        await this.appointmentAccessService.validateDoctorMedicalHistoryAccess(
            history,
            currentUser.sub,
        );
        console.log('History ID =', history.id);
        return this.createMedicine(
            history.id,
            null,
            currentUser.sub,
            dto,
        );
    }

    async createProfileMedicineByAppointment(
        appointmentId: number,
        dto: CreatePrescribedMedicineDto,
        currentUser: ActiveUserData,
    ): Promise<PrescribedMedicine> {

        /*const { appointment } =
            await this.appointmentAccessService.validateDoctorAppointmentAccess(
                appointmentId,
                currentUser.sub,
            );*/
        const medicalProfile =
            await this.appointmentAccessService.getMedicalProfileByAppointment(
                appointmentId,
                currentUser.sub,
            );


        if (!medicalProfile) {
            throw new NotFoundException('Medical profile not found');
        }

        return this.createMedicine(
            null,
            medicalProfile.id,
            currentUser.sub,
            dto,
        );
    }

    async createMyProfileMedicine(
        dto: CreatePrescribedMedicineDto,
        currentUser: ActiveUserData,
    ): Promise<PrescribedMedicine> {

        const patientProfile = await this.patientRepository.findOne({
            where: {
                userId: currentUser.sub,
            },
        });

        if (!patientProfile) {
            throw new NotFoundException('Patient profile not found');
        }

        const medicalProfile = await this.medicalProfileRepository.findOne({
            where: {
                patientProfileId: patientProfile.id,
            },
        });

        if (!medicalProfile) {
            throw new NotFoundException('Medical profile not found');
        }

        return this.createMedicine(
            null,
            medicalProfile.id,
            currentUser.sub,
            dto,
        );
    }
    private async createMedicine(
        medicalHistoryId: number | null,
        medicalProfileId: number | null,
        userId: number,
        dto: CreatePrescribedMedicineDto,
    ): Promise<PrescribedMedicine> {
        console.log('medicalHistoryId =', medicalHistoryId);
        const medicine = this.medicineRepository.create({

            medicalHistoryId,

            medicalProfileId,

            userId,

            medicineName: dto.medicineName,

            dosage: dto.dosage ?? null,

            frequency: dto.frequency ?? null,

            startDate: dto.startDate
                ? new Date(dto.startDate)
                : null,

            endDate: dto.endDate
                ? new Date(dto.endDate)
                : null,

            notes: dto.notes ?? null,
        });
        console.log(medicine);
        return this.medicineRepository.save(medicine);
    }

    async getMyMedicines(
        currentUser: ActiveUserData,
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
        const histories = await this.medicalHistoryRepository.find({
            where: {
                medicalProfileId: medicalProfile.id,
            },
        });


        const historyIds = histories.map((history) => history.id);


        const profileMedicines =
            await this.medicineRepository.find({
                where: {
                    medicalProfileId: medicalProfile.id,
                    medicalHistoryId: IsNull(),
                },

                order: {
                    created_at: 'DESC',
                },
            });

        let historyMedicines: PrescribedMedicine[] = [];

        if (historyIds.length > 0) {
            historyMedicines =
                await this.medicineRepository.find({
                    where: {
                        medicalHistoryId: In(historyIds),
                    },

                    relations: {
                        medicalHistory: true,
                    },

                    order: {
                        created_at: 'DESC',
                    },
                });
        }
        /*const historyMedicines =
            await this.medicineRepository.find({
                where: {
                    medicalHistoryId: In(historyIds),
                },

                relations: {
                    medicalHistory: true,
                },

                order: {
                    created_at: 'DESC',
                },
            });*/

        return {
            profileMedicines,
            historyMedicines,
        };
    }
    async getPatientMedicines(
        appointmentId: number,
        currentUser: ActiveUserData,
    ) {

        const medicalProfile =
            await this.appointmentAccessService.getMedicalProfileByAppointment(
                appointmentId,
                currentUser.sub,
            );
        const histories = await this.medicalHistoryRepository.find({
            where: {
                medicalProfileId: medicalProfile.id,
            },
        });


        const historyIds = histories.map((history) => history.id);
        const profileMedicines =
            await this.medicineRepository.find({
                where: {
                    medicalProfileId: medicalProfile.id,
                    medicalHistoryId: IsNull(),
                },

                order: {
                    created_at: 'DESC',
                },
            });
        let historyMedicines: PrescribedMedicine[] = [];

        if (historyIds.length > 0) {
            historyMedicines =
                await this.medicineRepository.find({
                    where: {
                        medicalHistoryId: In(historyIds),
                    },

                    relations: {
                        medicalHistory: true,
                    },

                    order: {
                        created_at: 'DESC',
                    },
                });
        }
        /*const historyMedicines =
            await this.medicineRepository.find({
                where: {
                    medicalHistoryId: In(historyIds),
                },

                relations: {
                    medicalHistory: true,
                },

                order: {
                    created_at: 'DESC',
                },
            });
*/
        return {
            profileMedicines,
            historyMedicines,
        };
    }
    async updateStatus(
        medicineId: number,
        dto: UpdateMedicineStatusDto,
        currentUser: ActiveUserData,
    ): Promise<PrescribedMedicine> {

        const medicine =
            await this.medicineRepository.findOne({
                where: {
                    id: medicineId,
                },

                relations: {
                    medicalHistory: true,
                },
            });

        if (!medicine) {
            throw new NotFoundException(
                'Medicine not found',
            );
        }

        if (Number(medicine.userId )=== Number(currentUser.sub)) {

            medicine.status = dto.status;

            return this.medicineRepository.save(
                medicine,
            );
        }

        if (!medicine.medicalHistory) {
            throw new ForbiddenException(
                'You are not allowed to update this medicine',
            );
        }

        await this.appointmentAccessService
            .validateDoctorMedicalHistoryAccess(
                medicine.medicalHistory,
                currentUser.sub,
            );

        medicine.status = dto.status;

        return this.medicineRepository.save(
            medicine,
        );
    }
}