import { Body, Controller, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';

import { AuthRolesGuard, VerifiedGuard } from '../auth/guards';

import { CurrentUser, Roles } from '../common/decorators';

import { ActiveUserData, UserRole } from '../utils';

import { MedicalHistoriesService } from './medical-histories.service';
import { CreateMedicalHistoryDto } from './dto/create-medical-history.dto';
import { MedicalHistory } from './entities/medical-history.entity';
import { Get, Query } from '@nestjs/common';

@Controller('medical-histories')
@UseGuards(AuthRolesGuard, VerifiedGuard)
export class MedicalHistoriesController {
    constructor(
        private readonly medicalHistoriesService: MedicalHistoriesService,
    ) { }

    @Post()
    @Roles(UserRole.DOCTOR)
    create(
        @CurrentUser()
        currentUser: ActiveUserData,

        @Body()
        dto: CreateMedicalHistoryDto,
    ): Promise<MedicalHistory> {
        return this.medicalHistoriesService.create(
            currentUser,

            dto,
        );
    }
    @Get('me')
    @Roles(UserRole.PATIENT)
    getMyMedicalHistories(
        @CurrentUser()
        currentUser: ActiveUserData,

        @Query('page')
        page = 1,

        @Query('limit')
        limit = 20,
    ) {
        return this.medicalHistoriesService.getMyMedicalHistories(
            currentUser,
            Number(page),
            Number(limit),
        );
    }
    @Get('appointment/:appointmentId')
    @Roles(UserRole.DOCTOR)
    getPatientMedicalHistory(
        @Param('appointmentId', ParseIntPipe)
        appointmentId: number,

        @CurrentUser()
        currentUser: ActiveUserData,
    ) {
        return this.medicalHistoriesService.getPatientMedicalHistory(
            appointmentId,
            currentUser,
        );
    }
}
