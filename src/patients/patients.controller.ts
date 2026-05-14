// patients.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthRolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { ActiveUserData, UserRole } from '../utils';
import { Appointment } from '../appointments/entities/appointment.entity';
import {
  CompletePatientProfileDto,
  CreatePatientProfileDto,
  PatientAppointmentsQueryDto,
  UpdatePatientDto,
} from './dto';
import { PatientProfile } from './entities/patient-profile.entity';
import { PatientsService, PatientAppointmentsGrouped, PatientProfileCompletionStatus, PatientWalletSummary } from './patients.service';

@Controller('patients')
@UseGuards(AuthRolesGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post('profile')
  @Roles(UserRole.PATIENT)
  async createProfile(
    @Body() createDto: CreatePatientProfileDto,
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<PatientProfile> {
    return this.patientsService.createProfile(currentUser.sub, createDto);
  }

  @Get('profile')
  @Roles(UserRole.PATIENT)
  async getProfile(
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<PatientProfile> {
    return this.patientsService.getProfile(currentUser.sub);
  }

  @Patch('profile')
  @Roles(UserRole.PATIENT)
  async updateProfile(
    @Body() updateDto: UpdatePatientDto,
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<PatientProfile> {
    return this.patientsService.updateProfile(currentUser.sub, updateDto);
  }

  @Get('profile/completion')
  @Roles(UserRole.PATIENT)
  async getProfileCompletion(
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<PatientProfileCompletionStatus> {
    return this.patientsService.getProfileCompletion(currentUser.sub);
  }

  @Patch('profile/completion')
  @Roles(UserRole.PATIENT)
  async completeProfile(
    @Body() completeDto: CompletePatientProfileDto,
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<PatientProfileCompletionStatus> {
    return this.patientsService.completeProfile(currentUser.sub, completeDto);
  }

  @Get('wallet')
  @Roles(UserRole.PATIENT)
  async getWallet(
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<PatientWalletSummary | null> {
    return this.patientsService.getWallet(currentUser.sub);
  }

  @Get('appointments')
  @Roles(UserRole.PATIENT)
  async listAppointments(
    @Query() query: PatientAppointmentsQueryDto,
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<Appointment[] | PatientAppointmentsGrouped> {
    return this.patientsService.getAppointments(currentUser.sub, query.status);
  }
}