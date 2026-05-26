import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthRolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { ActiveUserData, UserRole } from '../utils';
import { DoctorAdminLogsService } from './doctor-admin-logs.service';
import { DoctorAdminLog } from './entities/doctor-admin-log.entity';
import { DoctorAdminLogQueryDto } from './dto';

@Controller('doctor-admin-logs')
export class DoctorAdminLogsController {
  constructor(private readonly doctorAdminLogsService: DoctorAdminLogsService) {}

  @Get('me')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.DOCTOR)
  getLogsForCurrentDoctor(
    @CurrentUser() user: ActiveUserData,
    @Query() query: DoctorAdminLogQueryDto,
  ): Promise<DoctorAdminLog[]> {
    return this.doctorAdminLogsService.getLogsForCurrentDoctor(Number(user.sub), query);
  }

  @Get('admin')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN)
  getLogsForAdmin(@Query() query: DoctorAdminLogQueryDto): Promise<DoctorAdminLog[]> {
    return this.doctorAdminLogsService.getLogsForAdmin(query);
  }
}
