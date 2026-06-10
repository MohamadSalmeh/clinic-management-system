import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
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

import { PatientViolation } from './entities/patient-violation.entity';
import { PatientViolationsService } from './patient-violations.service';

@Controller('patient-violations')
@UseGuards(
    AuthRolesGuard,
    VerifiedGuard,
)
export class PatientViolationsController {

    constructor(

        private readonly patientViolationsService:
            PatientViolationsService,

    ) { }

    @Get('me')
    @Roles(UserRole.PATIENT)
    getMyViolations(

        @CurrentUser()
        currentUser: ActiveUserData,

    ): Promise<PatientViolation[]> {

        return this.patientViolationsService.getMyViolations(
            currentUser.sub,
        );

    }

    @Get('me/count')
    @Roles(UserRole.PATIENT)
    async getMyViolationCount(

        @CurrentUser()
        currentUser: ActiveUserData,

    ) {

        const count =
            await this.patientViolationsService.getMyViolationCount(
                currentUser.sub,
            );

        return {

            count,

        };

    }

    @Get('user/:userId')
    @Roles(UserRole.ADMIN)
    getUserViolations(

        @Param(
            'userId',
            ParseIntPipe,
        )
        userId: number,

    ): Promise<PatientViolation[]> {

        return this.patientViolationsService.getUserViolations(
            userId,
        );

    }

}