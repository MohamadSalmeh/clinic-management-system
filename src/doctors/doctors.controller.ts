import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { AuthRolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { ActiveUserData, UserRole } from '../utils';
import { UpdateDoctorProfileDto, UpdateDoctorStatusDto} from './dto';
import {
  DoctorsService,
  DoctorProfileCompletionStatus,
  DoctorSearchQuery,
} from './doctors.service';
import { DoctorProfile } from './entities/doctor-profile.entity';

@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) { }

  @Get('me')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.DOCTOR)
  findMe(
    @CurrentUser() user: ActiveUserData,
  ): Promise<{ profile: DoctorProfile; completionStatus: DoctorProfileCompletionStatus }> {
    return this.doctorsService.findMe(Number(user.sub));
  }

  @Get('me/dashboard')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.DOCTOR)
  getMyDashboard(
    @CurrentUser() user: ActiveUserData,
  ) {
    return this.doctorsService.getMyDashboard(
      Number(user.sub),
    );
  }

  @Get()
  async findAll(@Query() query: DoctorSearchQuery): Promise<DoctorProfile[]> {
    return this.doctorsService.findAll(query);
  }
  @Patch(':doctorId/status')
@UseGuards(AuthRolesGuard)
@Roles(UserRole.ADMIN)
updateDoctorStatus(
  @Param('doctorId', ParseIntPipe) doctorId: number,
  @Body() dto: UpdateDoctorStatusDto,
): Promise<DoctorProfile> {
  return this.doctorsService.updateDoctorStatus(
    doctorId,
    dto,
  );
}


  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<DoctorProfile> {
    return this.doctorsService.findOne(id);
  }

  @Patch('me')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.DOCTOR)
  updateProfile(
    @CurrentUser() user: ActiveUserData,
    @Body() dto: UpdateDoctorProfileDto,
  ): Promise<{ profile: DoctorProfile; completionStatus: DoctorProfileCompletionStatus }> {
    return this.doctorsService.updateProfile(Number(user.sub), dto);
  }
  
}
