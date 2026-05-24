import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { DoctorClinic } from '../doctor-clinics/entities/doctor-clinic.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { Clinic } from './entities/clinic.entity';
import { ClinicsService } from './clinics.service';
import { ClinicsController } from './clinics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Clinic, DoctorProfile, DoctorClinic]),
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [ClinicsController],
  providers: [ClinicsService],
  exports: [TypeOrmModule, ClinicsService],
})
export class ClinicsModule {}
