import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';

import { MedicalAttachment } from './entities/medical-attachment.entity';
import { MedicalHistory } from '../medical-histories/entities/medical-history.entity';
import { MedicalProfile } from '../medical-profiles/entities/medical-profile.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { Response } from 'express';
import { FileStorageService } from '../file-storage/file-storage.service';
import { CreateMedicalAttachmentDto } from './dto/create-medical-attachment.dto';
import { ActiveUserData } from '../utils';
import { AppointmentAccessService } from '../appointment-access/appointment-access.service';
import { CurrentUser } from '../common/decorators';
import * as path from 'path';

@Injectable()
export class MedicalAttachmentsService {
    constructor(
        @InjectRepository(MedicalAttachment)
        private readonly attachmentRepository: Repository<MedicalAttachment>,

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

        private readonly fileStorageService: FileStorageService,
        private readonly appointmentAccessService: AppointmentAccessService,
    ) { }
    private async createAttachment(
        medicalHistoryId: number | null,
        medicalProfileId: number | null,
        userId: number,
        file: Express.Multer.File,
    ): Promise<MedicalAttachment> {

        const storedPath = await this.fileStorageService.saveFile(
            file,
            'medical-attachments',
        );

        const attachment = this.attachmentRepository.create({

            medicalHistoryId,

            medicalProfileId,

            userId,

            filePath: storedPath,

            fileType: file.mimetype,

            originalName: file.originalname,
        });

        return this.attachmentRepository.save(attachment);
    }

    async uploadProfileAttachmentByAppointment(
        appointmentId: number,
        files: Express.Multer.File[],
        currentUser: ActiveUserData,
    ): Promise<MedicalAttachment[]> {

        const { appointment } =
            await this.appointmentAccessService.validateDoctorAppointmentAccess(
                appointmentId,
                currentUser.sub,
            );

        const medicalProfile = await this.medicalProfileRepository.findOne({
            where: {
                patientProfileId: appointment.patientId,
            },
        });

        if (!medicalProfile) {
            throw new NotFoundException('Medical profile not found');
        }

        /*return this.createAttachment(
            null,
            medicalProfile.id,
            currentUser.sub,
            file,
        );*/
        const attachments: MedicalAttachment[] = [];

        for (const file of files) {
            attachments.push(
                await this.createAttachment(
                    null,
                    medicalProfile.id,
                    currentUser.sub,
                    file,
                ),
            );
        }

        return attachments;
    }

    async uploadHistoryAttachment(
        historyId: number,
        files: Express.Multer.File[],
        dto: CreateMedicalAttachmentDto,
        currentUser: ActiveUserData,
    ): Promise<MedicalAttachment[]> {

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

        /*return this.createAttachment(
            history.id,
            null,
            currentUser.sub,
            file,
        );*/
        const attachments: MedicalAttachment[] = [];

        for (const file of files) {

            attachments.push(

                await this.createAttachment(
                    history.id,
                    null,
                    currentUser.sub,
                    file,
                ),

            );

        }

        return attachments;
    }
    async uploadMyProfileAttachment(
        files: Express.Multer.File[],
        currentUser: ActiveUserData,
    ): Promise<MedicalAttachment[]> {
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

        /*return this.createAttachment(
            null,
            medicalProfile.id,
            currentUser.sub,
            file,
        );*/
        const attachments: MedicalAttachment[] = [];

        for (const file of files) {

            attachments.push(

                await this.createAttachment(
                    null,
                    medicalProfile.id,
                    currentUser.sub,
                    file,
                ),

            );

        }

        return attachments;
    }
    /*async getMyAttachments(
        currentUser: ActiveUserData,
    ): Promise<MedicalAttachment[]> {

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

        return this.attachmentRepository.find({
            where: {
                medicalProfileId: medicalProfile.id,
            },

            order: {
                created_at: 'DESC',
            },
        });
    }*/
    async getMyAttachments(
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

        const historyIds = histories.map(history => history.id);

        const profileAttachments =
            await this.attachmentRepository.find({
                where: {
                    medicalProfileId: medicalProfile.id,
                    medicalHistoryId: IsNull(),
                },

                order: {
                    created_at: 'DESC',
                },
            });

        let historyAttachments: MedicalAttachment[] = [];

        if (historyIds.length > 0) {

            historyAttachments =
                await this.attachmentRepository.find({

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

        return {
            profileAttachments,
            historyAttachments,
        };
    }
    async getPatientAttachments(
        appointmentId: number,
        currentUser: ActiveUserData,
    ) {

        const medicalProfile =
            await this.appointmentAccessService.getMedicalProfileByAppointment(
                appointmentId,
                currentUser.sub,
            );

        const profileAttachments =
            await this.attachmentRepository.find({
                where: {
                    medicalProfileId: medicalProfile.id,
                },

                order: {
                    created_at: 'DESC',
                },
            });

        const historyAttachments =
            await this.attachmentRepository
                .createQueryBuilder('attachment')

                .innerJoin(
                    MedicalHistory,
                    'history',
                    'history.id = attachment.medicalHistoryId',
                )

                .where(
                    'history.medicalProfileId = :medicalProfileId',
                    {
                        medicalProfileId: medicalProfile.id,
                    },
                )

                .orderBy(
                    'attachment.created_at',
                    'DESC',
                )

                .getMany();

        return {
            profileAttachments,
            historyAttachments,
        };
    }
    async remove(
        attachmentId: number,
        currentUser: ActiveUserData,
    ): Promise<void> {

        const attachment =
            await this.attachmentRepository.findOne({
                where: {
                    id: attachmentId,
                },
            });

        if (!attachment) {
            throw new NotFoundException(
                'Attachment not found',
            );
        }

        if (Number(attachment.userId) !== Number(currentUser.sub)) {
            throw new ForbiddenException(
                'You are not allowed to delete this attachment',
            );
        }

        await this.fileStorageService.deleteFile(
            attachment.filePath,
        );

        await this.attachmentRepository.remove(
            attachment,
        );
    }
    async getAttachment(
        attachmentId: number,
        currentUser: ActiveUserData,
        response: Response,
    ): Promise<void> {

        const attachment = await this.attachmentRepository.findOne({
            where: {
                id: attachmentId,
            },
        });

        if (!attachment) {
            throw new NotFoundException('Attachment not found');
        }

        // المريض
        if (attachment.userId === currentUser.sub) {

            return response.sendFile(
                path.resolve(attachment.filePath),
            );
        }

        // الطبيب
        if (attachment.medicalHistoryId) {

            const history = await this.medicalHistoryRepository.findOne({
                where: {
                    id: attachment.medicalHistoryId,
                },
            });

            if (!history) {
                throw new NotFoundException('Medical history not found');
            }

            await this.appointmentAccessService
                .validateDoctorMedicalHistoryAccess(
                    history,
                    currentUser.sub,
                );

            return response.sendFile(
                path.resolve(attachment.filePath),
            );
        }

        throw new ForbiddenException(
            'You are not allowed to access this attachment',
        );
    }
    async getMyAttachment(
        attachmentId: number,
        currentUser: ActiveUserData,
        response: Response,
    ): Promise<void> {

        const attachment = await this.attachmentRepository.findOne({
            where: {
                id: attachmentId,
            },
            relations: {
                medicalHistory: true,
            },
        });

        if (!attachment) {
            throw new NotFoundException('Attachment not found');
        }
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

        const belongsToPatient =

            attachment.medicalProfileId === medicalProfile.id ||

            attachment.medicalHistory?.medicalProfileId === medicalProfile.id;

        if (!belongsToPatient) {
            throw new ForbiddenException(
                'You are not allowed to access this attachment',
            );
        }

        return response.sendFile(
            path.resolve(attachment.filePath),
        );
    }
    async getPatientAttachment(
        appointmentId: number,
        attachmentId: number,
        currentUser: ActiveUserData,
        response: Response,
    ): Promise<void> {

        const medicalProfile =
            await this.appointmentAccessService.getMedicalProfileByAppointment(
                appointmentId,
                currentUser.sub,
            );

        const attachment = await this.attachmentRepository.findOne({
            where: {
                id: attachmentId,
            },
        });

        if (!attachment) {
            throw new NotFoundException('Attachment not found');
        }

        if (
            attachment.medicalProfileId !== medicalProfile.id &&
            attachment.medicalHistoryId
        ) {

            const history = await this.medicalHistoryRepository.findOne({
                where: {
                    id: attachment.medicalHistoryId,
                },
            });

            if (
                !history ||
                history.medicalProfileId !== medicalProfile.id
            ) {
                throw new ForbiddenException(
                    'You are not allowed to access this attachment',
                );
            }
        }

        return response.sendFile(
            path.resolve(attachment.filePath),
        );
    }

}