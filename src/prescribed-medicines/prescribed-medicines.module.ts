import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrescribedMedicine } from './entities/prescribed-medicine.entity';
import { MedicalHistory } from '../medical-histories/entities/medical-history.entity';
import { MedicalProfile } from '../medical-profiles/entities/medical-profile.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { AppointmentAccessModule } from '../appointment-access/appointment-access.module';
import { PrescribedMedicinesController } from './prescribed-medicines.controller';
import { PrescribedMedicinesService } from './prescribed-medicines.service';
import { AuthModule } from '../auth';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PrescribedMedicine,
      MedicalHistory,
      MedicalProfile,
      Appointment,
      DoctorProfile,
      PatientProfile,
    ]),
    AppointmentAccessModule,
    AuthModule,
  ],
  controllers: [PrescribedMedicinesController],
  providers: [PrescribedMedicinesService],
  exports: [PrescribedMedicinesService],
})
export class PrescribedMedicinesModule { }
