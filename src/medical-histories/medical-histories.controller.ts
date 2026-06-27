import {
    Body,
    Controller,
    Post,
    UseGuards,
} from '@nestjs/common';

import {
    AuthRolesGuard,
    VerifiedGuard,
} from '../auth/guards';

import {
    CurrentUser,
    Roles,
} from '../common/decorators';

import {
    ActiveUserData,
    UserRole,
} from '../utils';

import { MedicalHistoriesService } from './medical-histories.service';
import { CreateMedicalHistoryDto } from './dto/create-medical-history.dto';
import { MedicalHistory } from './entities/medical-history.entity';

@Controller('medical-histories')
@UseGuards(AuthRolesGuard, VerifiedGuard)
export class MedicalHistoriesController {

    constructor(

        private readonly medicalHistoriesService:
            MedicalHistoriesService,

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

}