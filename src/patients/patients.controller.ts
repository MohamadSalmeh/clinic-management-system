// patients.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AuthRolesGuard, VerifiedGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { ActiveUserData, UserRole } from '../utils';
import {
  CreatePatientProfileDto,
  UpdatePatientDto,
} from './dto';
import { PatientProfile } from './entities/patient-profile.entity';
import { PatientsService } from './patients.service';

@Controller('patients')
@UseGuards(AuthRolesGuard, VerifiedGuard)
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

  
}