import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthRolesGuard } from '../auth/guards';
import { Roles } from '../common/decorators';
import { UserRole } from '../utils';
import { AssignDoctorDto } from './dto';
import { DoctorClinicsService } from './doctor-clinics.service';
import { Clinic } from '../clinics/entities/clinic.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';

@Controller('doctor-clinics')
export class DoctorClinicsController {
  constructor(private readonly doctorClinicsService: DoctorClinicsService) {}

  @Post()
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN)
  async assignDoctor(@Body() dto: AssignDoctorDto) {
    return this.doctorClinicsService.assignDoctor(dto);
  }

  @Delete('clinics/:clinicId/doctors/:doctorId')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN)
  async unassignDoctor(
    @Param('clinicId', ParseIntPipe) clinicId: number,
    @Param('doctorId', ParseIntPipe) doctorId: number,
  ): Promise<{ message: string }> {
    await this.doctorClinicsService.unassignDoctor(clinicId, doctorId);
    return { message: 'Doctor unassigned from clinic' };
  }

@Get('doctors/:doctorId/clinics')
  async getClinicsForDoctor(
    @Param('doctorId', ParseIntPipe) doctorId: number,
  ): Promise<Clinic[]> {
    return this.doctorClinicsService.getClinicsForDoctor(doctorId);
  }

  @Get('clinics/:clinicId/doctors')
  async getDoctorsInClinic(
    @Param('clinicId', ParseIntPipe) clinicId: number,
  ): Promise<DoctorProfile[]> {
    return this.doctorClinicsService.getDoctorsInClinic(clinicId);
  }
}
