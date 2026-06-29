import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicalProfileLogsModule } from '../medical-profile-logs/medical-profile-logs.module';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { MedicalHistory } from '../medical-histories/entities/medical-history.entity';
import { AuthModule } from '../auth';
import { MedicalProfile } from './entities/medical-profile.entity';
import { MedicalProfilesController } from './medical-profiles.controller';
import { MedicalProfilesService } from './medical-profiles.service';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AppointmentAccessModule } from '../appointment-access/appointment-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MedicalProfile,
      PatientProfile,
      MedicalHistory,
      Appointment,
      DoctorProfile,
      AppointmentAccessModule,
    ]),
    AppointmentAccessModule,
    MedicalProfileLogsModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [MedicalProfilesController],
  providers: [MedicalProfilesService],
  exports: [TypeOrmModule, MedicalProfilesService],
})
export class MedicalProfilesModule { }
