import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthRolesGuard, VerifiedGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { ActiveUserData, UserRole } from '../utils';
import { Appointment } from './entities/appointment.entity';
import { PatientAppointmentsQueryDto } from '../patients/dto';
import { PatientsService, PatientAppointmentsGrouped } from '../patients/patients.service';

@Controller('appointments')
@UseGuards(AuthRolesGuard, VerifiedGuard)
export class AppointmentsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get('my')
  @Roles(UserRole.PATIENT)
  async listAppointments(
    @Query() query: PatientAppointmentsQueryDto,
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<Appointment[] | PatientAppointmentsGrouped> {
    return this.patientsService.getAppointments(currentUser.sub, query.status);
  }
}
