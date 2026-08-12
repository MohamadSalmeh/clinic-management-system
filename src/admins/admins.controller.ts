import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  Res
} from '@nestjs/common';
import { MedicalAttachmentsService } from '../medical-attachments/medical-attachments.service';
import { CurrentUser, Roles } from '../common/decorators';
import { ActiveUserData, UserRole } from '../utils';
import { AuthRolesGuard, VerifiedGuard } from '../auth/guards';
import { DoctorInvitationsService } from '../doctor-invitations/doctor-invitations.service';
import { CreateDoctorInvitationDto } from './dto';
import { AdminsService } from './admins.service';
import { DoctorInvitation } from '../doctor-invitations/entities/doctor-invitation.entity';
import {
  Query
} from '@nestjs/common';
import {
  AdminDoctorsQuery,
  DoctorsService,
} from '../doctors/doctors.service';
import { PatientsService } from '../patients/patients.service';

import {
  AdminPatientsQuery
} from '../patients/patients.service';
import { Response } from 'express';
@Controller('admin')
@UseGuards(AuthRolesGuard, VerifiedGuard)
@Roles(UserRole.ADMIN)
export class AdminsController {
  constructor(
    private readonly adminsService: AdminsService,
    private readonly doctorInvitationsService: DoctorInvitationsService,
    private readonly doctorsService: DoctorsService,
    private readonly patientsService: PatientsService,
    private readonly medicalAttachmentsService: MedicalAttachmentsService,
  ) { }

  @Post('profile/init')
  async initAdminProfile(
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<{ message: string; profileId: number; created: boolean }> {
    const result = await this.adminsService.createAdminProfile(currentUser.sub);
    const message = result.created
      ? 'Admin profile created'
      : 'Admin profile already exists';

    return {
      message,
      profileId: result.profile.id,
      created: result.created,
    };
  }

  @Post('doctor-invitations')
  async createDoctorInvitation(
    @Body() dto: CreateDoctorInvitationDto,
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<{ message: string; invitationId: number; email: string }> {
    const adminProfile = await this.adminsService.getAdminProfileByUserId(
      currentUser.sub,
    );
    const invitation = await this.doctorInvitationsService.createInvitation(
      dto.email,
      adminProfile.id,
    );

    return {
      message: 'Invitation created',
      invitationId: invitation.id,
      email: invitation.email,
    };
  }

  @Get('doctor-invitations')
  async listDoctorInvitations(): Promise<DoctorInvitation[]> {
    return this.doctorInvitationsService.listInvitations();
  }

  @Post('doctor-invitations/:id/cancel')
  async cancelDoctorInvitation(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.doctorInvitationsService.cancelInvitation(id);

    return { message: 'Invitation cancelled' };
  }
  @Get('doctors')
  getDoctors(
    @Query() query: AdminDoctorsQuery,
  ) {
    return this.doctorsService.findAllForAdmin(query);
  }


  @Get('patients')
  getPatients(
    @Query() query: AdminPatientsQuery,
  ) {
    return this.patientsService.findAllForAdmin(query);
  }
  @Get('patients/:patientId/attachments')
  getPatientAttachments(
    @Param('patientId', ParseIntPipe)
    patientId: number,
  ) {
    return this.medicalAttachmentsService.getPatientAttachmentsForAdmin(
      patientId,
    );
  }
  @Get('medical-attachments/:attachmentId/download')
  downloadAttachment(
    @Param('attachmentId', ParseIntPipe)
    attachmentId: number,

    @Res()
    response: Response,
  ) {
    return this.medicalAttachmentsService.downloadAttachmentForAdmin(
      attachmentId,
      response,
    );
  }
}
