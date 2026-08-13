// filepath: src/admins/admins.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  Res,
  Query,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { MedicalAttachmentsService } from '../medical-attachments/medical-attachments.service';
import { CurrentUser, Roles } from '../common/decorators';
import { ActiveUserData, UserRole } from '../utils';
import { AuthRolesGuard, VerifiedGuard } from '../auth/guards';
import { DoctorInvitationsService } from '../doctor-invitations/doctor-invitations.service';
import { CreateDoctorInvitationDto } from './dto';
import { AdminsService } from './admins.service';
import { DoctorInvitation } from '../doctor-invitations/entities/doctor-invitation.entity';
import { AdminDoctorsQuery, DoctorsService } from '../doctors/doctors.service';
import { PatientsService, AdminPatientsQuery } from '../patients/patients.service';
import { Response } from 'express';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminDashboardQueryDto } from './dto/admin-dashboard-query.dto';
import { AdminDashboardResponseDto } from './dto/admin-dashboard-response.dto';
import { DashboardRange } from './interfaces/admin-dashboard.interface';
import { AdminPatientsService } from './admin-patients.service';
import { AdminRatingsService } from './admin-ratings.service';
import { AdminReportsService } from './admin-reports.service';
import { AdminDoctorsService } from './admin-doctors.service';
import { UpdateDoctorStatusDto } from './dto/update-doctor-status.dto';

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
    private readonly adminDashboardService: AdminDashboardService,
    private readonly adminPatientsService: AdminPatientsService,
    private readonly adminRatingsService: AdminRatingsService,
    private readonly adminReportsService: AdminReportsService,
    private readonly adminDoctorsService: AdminDoctorsService,
  ) {}

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
  getDoctors(@Query() query: AdminDoctorsQuery) {
    return this.doctorsService.findAllForAdmin(query);
  }

  @Get('patients')
  getPatients(@Query() query: AdminPatientsQuery) {
    return this.patientsService.findAllForAdmin(query);
  }

  @Get('patients/:patientId/attachments')
  getPatientAttachments(@Param('patientId', ParseIntPipe) patientId: number) {
    return this.medicalAttachmentsService.getPatientAttachmentsForAdmin(
      patientId,
    );
  }

  @Get('medical-attachments/:attachmentId/download')
  downloadAttachment(
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @Res() response: Response,
  ) {
    return this.medicalAttachmentsService.downloadAttachmentForAdmin(
      attachmentId,
      response,
    );
  }

  // ========== PHASE 1: Admin Dashboard ==========
  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  public async getDashboard(
    @Query() query: AdminDashboardQueryDto,
  ): Promise<AdminDashboardResponseDto> {
    const data = await this.adminDashboardService.getDashboardData(
      query.range ?? DashboardRange.RANGE_30D,
    );
    return data as AdminDashboardResponseDto;
  }

  // ========== PHASE 2: Admin Management Endpoints ==========
  @Get('patients/:id/medical-details')
  @HttpCode(HttpStatus.OK)
  public async getPatientMedicalDetails(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.adminPatientsService.getPatientMedicalDetails(id);
  }

  @Get('ratings/:id')
  @HttpCode(HttpStatus.OK)
  public async getRatingDetails(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.adminRatingsService.getRatingDetails(id);
  }

  @Get('reports/:id')
  @HttpCode(HttpStatus.OK)
  public async getReportDetails(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.adminReportsService.getReportDetails(id);
  }

  @Patch('doctors/:id/status')
  @HttpCode(HttpStatus.OK)
  public async deactivateDoctor(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDoctorStatusDto,
  ) {
    return this.adminDoctorsService.deactivateDoctor(id);
  }

  // ========== PHASE 3: Admin Patient Management Endpoints ==========
  // ✅ الـ Controller معرف بـ @Controller('admin')، لذلك المسار يبدأ بـ 'patients/...'

  @Get('patients/:patientId')
  @HttpCode(HttpStatus.OK)
  public async getPatientBasicProfile(
    @Param('patientId', ParseIntPipe) patientId: number,
  ) {
    return this.adminPatientsService.getPatientBasicProfile(patientId);
  }

  @Get('patients/:patientId/appointments')
  @HttpCode(HttpStatus.OK)
  public async getPatientAppointments(
    @Param('patientId', ParseIntPipe) patientId: number,
  ) {
    return this.adminPatientsService.getPatientAppointments(patientId);
  }

  @Get('patients/:patientId/medical-profile')
  @HttpCode(HttpStatus.OK)
  public async getPatientMedicalProfile(
    @Param('patientId', ParseIntPipe) patientId: number,
  ) {
    return this.adminPatientsService.getPatientMedicalProfile(patientId);
  }

  @Get('patients/:patientId/medical-histories')
  @HttpCode(HttpStatus.OK)
  public async getPatientMedicalHistories(
    @Param('patientId', ParseIntPipe) patientId: number,
  ) {
    return this.adminPatientsService.getPatientMedicalHistories(patientId);
  }

  @Get('patients/:patientId/medical-profile-logs')
  @HttpCode(HttpStatus.OK)
  public async getPatientMedicalProfileLogs(
    @Param('patientId', ParseIntPipe) patientId: number,
  ) {
    return this.adminPatientsService.getPatientMedicalProfileLogs(patientId);
  }
}