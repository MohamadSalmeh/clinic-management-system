import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { AuthRolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { ActiveUserData, UserRole } from '../utils';
import { UpdateDoctorProfileDto } from './dto';
import { DoctorsService, DoctorProfileCompletionStatus } from './doctors.service';
import { DoctorProfile } from './entities/doctor-profile.entity';

@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

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
