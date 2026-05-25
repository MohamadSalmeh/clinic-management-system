import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ClinicsModule } from '../clinics/clinics.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { UsersModule } from '../users/users.module';
import { DoctorClinic } from './entities/doctor-clinic.entity';
import { DoctorClinicsService } from './doctor-clinics.service';
import { DoctorClinicsController } from './doctor-clinics.controller';
import { Clinic } from '../clinics/entities/clinic.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DoctorClinic, Clinic, DoctorProfile]),
    DoctorsModule,
    ClinicsModule,
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [DoctorClinicsController],
  providers: [DoctorClinicsService],
  exports: [TypeOrmModule, DoctorClinicsService],
})
export class DoctorClinicsModule {}
