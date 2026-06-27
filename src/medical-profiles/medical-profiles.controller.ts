import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthRolesGuard, VerifiedGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { ActiveUserData, UserRole } from '../utils';
import { MedicalProfileCompletionStatus, MedicalProfilesService, MedicalProfileResponse } from './medical-profiles.service';
import { CreateMedicalProfileDto, UpdateMedicalProfileDto } from './dto';
import { MedicalProfile } from './entities/medical-profile.entity';
import {
  Param,
  ParseIntPipe,
} from '@nestjs/common';
@Controller('medical-profiles')
@UseGuards(AuthRolesGuard, VerifiedGuard)
export class MedicalProfilesController {
  constructor(
    private readonly medicalProfilesService: MedicalProfilesService,
  ) { }

  @Post()
  @Roles(UserRole.PATIENT)
  async createProfile(
    @Body() dto: CreateMedicalProfileDto,
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<MedicalProfile> {
    return this.medicalProfilesService.createProfile(currentUser.sub, dto);
  }

  @Get('me')
  @Roles(UserRole.PATIENT)
  async getCurrentProfile(
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<MedicalProfileResponse> {
    return this.medicalProfilesService.getCurrentProfile(currentUser.sub);
  }

  @Patch('me')
  @Roles(UserRole.PATIENT)
  async updateCurrentProfile(
    @Body() dto: UpdateMedicalProfileDto,
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<MedicalProfileResponse> {
    return this.medicalProfilesService.updateCurrentProfile(currentUser.sub, dto);
  }

  @Get('completion')
  @Roles(UserRole.PATIENT)
  async getCompletionStatus(
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<MedicalProfileCompletionStatus> {
    return this.medicalProfilesService.getCompletionStatus(currentUser.sub);
  }
  @Patch('appointment/:appointmentId')
  @Roles(UserRole.DOCTOR)
  async updateMedicalProfileByAppointment(

    @Param(
      'appointmentId',
      ParseIntPipe,
    )
    appointmentId: number,

    @Body()
    dto: UpdateMedicalProfileDto,

    @CurrentUser()
    currentUser: ActiveUserData,

  ): Promise<MedicalProfileResponse> {

    return this.medicalProfilesService.updateByAppointment(

      appointmentId,

      currentUser,

      dto,

    );

  }


}
