import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';

import { AuthRolesGuard, VerifiedGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { ActiveUserData, UserRole } from '../utils';

import { CreatePrescribedMedicineDto } from './dto/create-prescribed-medicine.dto';
import { PrescribedMedicinesService } from './prescribed-medicines.service';
import { UpdateMedicineStatusDto } from './dto/update-medicine-status.dto';

@Controller('prescribed-medicines')
@UseGuards(AuthRolesGuard, VerifiedGuard)
export class PrescribedMedicinesController {
    constructor(
        private readonly prescribedMedicinesService: PrescribedMedicinesService,
    ) { }

    @Post('history/:historyId')
    @Roles(UserRole.DOCTOR)
    createHistoryMedicine(
        @Param('historyId', ParseIntPipe)
        historyId: number,

        @Body()
        dto: CreatePrescribedMedicineDto,

        @CurrentUser()
        currentUser: ActiveUserData,
    ) {
        return this.prescribedMedicinesService.createHistoryMedicine(
            historyId,
            dto,
            currentUser,
        );
    }

    @Post('profile/appointment/:appointmentId')
    @Roles(UserRole.DOCTOR)
    createProfileMedicineByAppointment(
        @Param('appointmentId', ParseIntPipe)
        appointmentId: number,

        @Body()
        dto: CreatePrescribedMedicineDto,

        @CurrentUser()
        currentUser: ActiveUserData,
    ) {
        return this.prescribedMedicinesService.createProfileMedicineByAppointment(
            appointmentId,
            dto,
            currentUser,
        );
    }

    @Post('profile/me')
    @Roles(UserRole.PATIENT)
    createMyProfileMedicine(
        @Body()
        dto: CreatePrescribedMedicineDto,

        @CurrentUser()
        currentUser: ActiveUserData,
    ) {
        return this.prescribedMedicinesService.createMyProfileMedicine(
            dto,
            currentUser,
        );
    }
    @Get('me')
    @Roles(UserRole.PATIENT)
    getMyMedicines(
        @CurrentUser()
        currentUser: ActiveUserData,
    ) {
        return this.prescribedMedicinesService.getMyMedicines(
            currentUser,
        );
    }
    @Get('appointment/:appointmentId')
    @Roles(UserRole.DOCTOR)
    getPatientMedicines(
        @Param('appointmentId', ParseIntPipe)
        appointmentId: number,

        @CurrentUser()
        currentUser: ActiveUserData,
    ) {
        return this.prescribedMedicinesService.getPatientMedicines(
            appointmentId,
            currentUser,
        );
    }

    @Patch(':medicineId/status')
    @Roles(UserRole.DOCTOR, UserRole.PATIENT)
    updateStatus(
        @Param('medicineId', ParseIntPipe)
        medicineId: number,

        @Body()
        dto: UpdateMedicineStatusDto,

        @CurrentUser()
        currentUser: ActiveUserData,
    ) {
        return this.prescribedMedicinesService.updateStatus(
            medicineId,
            dto,
            currentUser,
        );
    }
}