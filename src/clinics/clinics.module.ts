import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorClinic } from '../doctor-clinics/entities/doctor-clinic.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { Clinic } from './entities/clinic.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Clinic, DoctorProfile, DoctorClinic])],
  exports: [ TypeOrmModule],
})
export class ClinicsModule {}
