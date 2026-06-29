import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Res,
    UploadedFile,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

import { AuthRolesGuard, VerifiedGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { ActiveUserData, UserRole } from '../utils';

import { multerConfig } from '../file-storage/multer.config';

import { MedicalAttachmentsService } from './medical-attachments.service';
import { CreateMedicalAttachmentDto } from './dto/create-medical-attachment.dto';
import { Response } from 'express';
@Controller('medical-attachments')
@UseGuards(AuthRolesGuard, VerifiedGuard)
export class MedicalAttachmentsController {
    constructor(
        private readonly medicalAttachmentsService: MedicalAttachmentsService,
    ) { }

    @Post('history/:historyId')
    @Roles(UserRole.DOCTOR)
    @UseInterceptors(FilesInterceptor('files', 10, multerConfig))
    uploadHistoryAttachment(
        @Param('historyId', ParseIntPipe)
        historyId: number,

        @UploadedFiles()
        files: Express.Multer.File[],

        @Body()
        dto: CreateMedicalAttachmentDto,

        @CurrentUser()
        currentUser: ActiveUserData,
    ) {
        return this.medicalAttachmentsService.uploadHistoryAttachment(
            historyId,
            files,
            dto,
            currentUser,
        );
    }
    @Post('profile/me')
    @Roles(UserRole.PATIENT)
    @UseInterceptors(FilesInterceptor('files', 10, multerConfig))
    uploadMyProfileAttachment(
        @UploadedFiles()
        files: Express.Multer.File[],

        @CurrentUser()
        currentUser: ActiveUserData,
    ) {
        return this.medicalAttachmentsService.uploadMyProfileAttachment(
            files,
            currentUser,
        );
    }
    @Post('profile/appointment/:appointmentId')
    @Roles(UserRole.DOCTOR)
    @UseInterceptors(FilesInterceptor('files', 10, multerConfig))
    uploadProfileAttachmentByAppointment(
        @Param('appointmentId', ParseIntPipe)
        appointmentId: number,

        @UploadedFiles()
        files: Express.Multer.File[],

        @CurrentUser()
        currentUser: ActiveUserData,
    ) {
        return this.medicalAttachmentsService.uploadProfileAttachmentByAppointment(
            appointmentId,
            files,
            currentUser,
        );
    }
    @Get('me')
    @Roles(UserRole.PATIENT)
    getMyAttachments(
        @CurrentUser()
        currentUser: ActiveUserData,
    ) {
        return this.medicalAttachmentsService.getMyAttachments(
            currentUser,
        );
    }
    @Get('appointment/:appointmentId')
    @Roles(UserRole.DOCTOR)
    getPatientAttachments(
        @Param('appointmentId', ParseIntPipe)
        appointmentId: number,

        @CurrentUser()
        currentUser: ActiveUserData,
    ) {
        return this.medicalAttachmentsService.getPatientAttachments(
            appointmentId,
            currentUser,
        );
    }
    @Delete(':attachmentId')
    @Roles(UserRole.PATIENT, UserRole.DOCTOR)
    remove(
        @Param('attachmentId', ParseIntPipe)
        attachmentId: number,

        @CurrentUser()
        currentUser: ActiveUserData,
    ) {
        return this.medicalAttachmentsService.remove(
            attachmentId,
            currentUser,
        );
    }
    @Get(':attachmentId')
    @Roles(UserRole.PATIENT, UserRole.DOCTOR)
    getAttachment(
        @Param('attachmentId', ParseIntPipe)
        attachmentId: number,

        @CurrentUser()
        currentUser: ActiveUserData,

        @Res()
        response: Response,
    ) {
        return this.medicalAttachmentsService.getAttachment(
            attachmentId,
            currentUser,
            response,
        );
    }
    @Get('me/:attachmentId')
    @Roles(UserRole.PATIENT)
    getMyAttachment(
        @Param('attachmentId', ParseIntPipe)
        attachmentId: number,

        @CurrentUser()
        currentUser: ActiveUserData,

        @Res()
        response: Response,
    ) {
        return this.medicalAttachmentsService.getMyAttachment(
            attachmentId,
            currentUser,
            response,
        );
    }
    @Get('appointment/:appointmentId/:attachmentId')
    @Roles(UserRole.DOCTOR)
    getPatientAttachment(
        @Param('appointmentId', ParseIntPipe)
        appointmentId: number,

        @Param('attachmentId', ParseIntPipe)
        attachmentId: number,

        @CurrentUser()
        currentUser: ActiveUserData,

        @Res()
        response: Response,
    ) {
        return this.medicalAttachmentsService.getPatientAttachment(
            appointmentId,
            attachmentId,
            currentUser,
            response,
        );
    }
}