import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthRolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { ActiveUserData, UserRole } from '../utils';
import { DoctorLeavesService } from './doctor-leaves.service';
import { CreateDoctorLeaveDto, DoctorLeaveQueryDto } from './dto';
import { DoctorLeave } from './entities/doctor-leaves.entity';

@Controller('doctor-leaves')
export class DoctorLeavesController {
  constructor(private readonly doctorLeavesService: DoctorLeavesService) {}

  @Post()
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  async createLeave(
    @CurrentUser() user: ActiveUserData,
    @Body() dto: CreateDoctorLeaveDto,
  ): Promise<DoctorLeave> {
    const isAdmin = user.usertype === UserRole.ADMIN.toUpperCase();
    return this.doctorLeavesService.createLeave(Number(user.sub), dto, isAdmin);
  }

  @Get('me')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.DOCTOR)
  async getLeavesForCurrentDoctor(
    @CurrentUser() user: ActiveUserData,
  ): Promise<DoctorLeave[]> {
    return this.doctorLeavesService.getLeavesForCurrentDoctor(Number(user.sub));
  }

  @Get('admin')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN)
  async getLeavesForAdmin(
    @Query() query: DoctorLeaveQueryDto,
  ): Promise<DoctorLeave[]> {
    return this.doctorLeavesService.getLeavesForAdmin(query);
  }

  @Delete(':id')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  async deleteLeave(
    @CurrentUser() user: ActiveUserData,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    const isAdmin = user.usertype === UserRole.ADMIN.toUpperCase();
    await this.doctorLeavesService.deleteLeave(id, Number(user.sub), isAdmin);
    return { message: 'Leave deleted' };
  }
}
