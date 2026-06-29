import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Appointment } from '../appointments/entities/appointment.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { PatientProfile } from '../patients/entities/patient-profile.entity';

import { AppointmentAccessService } from './appointment-access.service';
import { MedicalProfile } from '../medical-profiles/entities/medical-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      DoctorProfile,
      PatientProfile,
      MedicalProfile,
    ]),
  ],

  providers: [AppointmentAccessService],

  exports: [AppointmentAccessService],
})
export class AppointmentAccessModule { }