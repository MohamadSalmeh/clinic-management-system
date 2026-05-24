import { Body, Controller, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
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

  @Patch('requests/:id/status')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN)
  updateRequestStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDoctorScheduleRequestStatusDto,
  ) {
    return this.doctorSchedulesService.updateRequestStatus(
      id,
      dto.status,
      dto.adminNotes,
    );
  }
}
