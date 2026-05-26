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
import { AuthRolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { ActiveUserData, UserRole } from '../utils';
import { CreateDoctorScheduleDto, UpdateDoctorScheduleRequestStatusDto } from './dto';
import { DoctorSchedulesService } from './doctor-schedules.service';

@Controller('doctor-schedules')
export class DoctorSchedulesController {
  constructor(private readonly doctorSchedulesService: DoctorSchedulesService) {}

  @Post()
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.DOCTOR)
  createOrUpdateWeeklyTemplate(
    @CurrentUser() user: ActiveUserData,
    @Body() dto: CreateDoctorScheduleDto,
  ) {
    return this.doctorSchedulesService.createOrUpdateWeeklyTemplate(
      Number(user.sub),
      dto,
    );
  }

  @Get('me')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.DOCTOR)
  getDoctorOwnSchedule(@CurrentUser() user: ActiveUserData) {
    return this.doctorSchedulesService.getDoctorOwnSchedule(Number(user.sub));
  }

  @Get('admin/doctor/:doctorProfileId')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN)
  getDoctorScheduleForAdmin(
    @Param('doctorProfileId', ParseIntPipe) doctorProfileId: number,
  ) {
    return this.doctorSchedulesService.getDoctorScheduleForAdmin(doctorProfileId);
  }

  @Get('admin/requests/pending')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN)
  getPendingScheduleRequestsForAdmin() {
    return this.doctorSchedulesService.getPendingScheduleRequestsForAdmin();
  }

  @Get('patient/doctor/:doctorProfileId/clinic/:clinicId')
  getDoctorScheduleForPatient(
    @Param('doctorProfileId', ParseIntPipe) doctorProfileId: number,
    @Param('clinicId', ParseIntPipe) clinicId: number,
  ) {
    return this.doctorSchedulesService.getDoctorScheduleForPatient(
      doctorProfileId,
      clinicId,
    );
  }

  @Get('clinic/:clinicId')
  getClinicSchedule(@Param('clinicId', ParseIntPipe) clinicId: number) {
    return this.doctorSchedulesService.getClinicSchedule(clinicId);
  }

  @Patch('requests/:id/status')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN)
  updateRequestStatus(
    @CurrentUser() user: ActiveUserData,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDoctorScheduleRequestStatusDto,
  ) {
    return this.doctorSchedulesService.updateRequestStatus(
      id,
      dto.status,
      dto.adminNotes,
      Number(user.sub),
    );
  }
}
