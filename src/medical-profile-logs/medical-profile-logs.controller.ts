import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthRolesGuard, VerifiedGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { ActiveUserData, UserRole } from '../utils';
import { MedicalProfileLogsService, MedicalProfileLogResponse } from './medical-profile-logs.service';
import { MedicalProfileLogQueryDto } from './dto';

@Controller('medical-profile-logs')
@UseGuards(AuthRolesGuard, VerifiedGuard)
export class MedicalProfileLogsController {
    constructor(
        private readonly medicalProfileLogsService: MedicalProfileLogsService,
    ) { }

    @Get('me')
    @Roles(UserRole.PATIENT)
    async getMyLogs(
        @CurrentUser() currentUser: ActiveUserData,
        @Query() query: MedicalProfileLogQueryDto,
    ): Promise<MedicalProfileLogResponse[]> {
        return this.medicalProfileLogsService.getLogsForCurrentPatient(
            currentUser.sub,
            query,
        );
    }

    @Get('patient/:patientId')
    @Roles(UserRole.DOCTOR, UserRole.ADMIN)
    async getPatientLogs(
        @Param('patientId', ParseIntPipe) patientId: number,
        @Query() query: MedicalProfileLogQueryDto,
    ): Promise<MedicalProfileLogResponse[]> {
        return this.medicalProfileLogsService.getLogsForPatient(patientId, query);
    }
}
