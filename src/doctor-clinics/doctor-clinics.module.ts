import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicsModule } from '../clinics/clinics.module';
import { DoctorsModule } from '../doctors/doctors.module';

import { DoctorClinic } from './entities/doctor-clinic.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DoctorClinic]), DoctorsModule, ClinicsModule],
  exports: [ TypeOrmModule],
})
export class DoctorClinicsModule {}
