import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth';
import { MedicalProfilesModule } from '../medical-profiles/medical-profiles.module';
import { DoctorClinic } from '../doctor-clinics/entities/doctor-clinic.entity';
import { DoctorLeave } from '../doctor-leaves/entities/doctor-leaves.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { DoctorSchedule } from '../doctor-schedules/entities/doctor-schedule.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { MedicalProfile } from '../medical-profiles/entities/medical-profile.entity';
import { Appointment } from './entities/appointment.entity';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './index';
import { QueuesModule } from '../queues/queues.module'; // سطر الإضافة الجديد

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      PatientProfile,
      DoctorProfile,
      Clinic,
      DoctorSchedule,
      DoctorLeave,
      DoctorClinic,
      MedicalProfile,
    ]),
    AuthModule,
    MedicalProfilesModule,
    forwardRef(() => QueuesModule), // الإضافة هنا لربط موديول الـ Queue
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [TypeOrmModule,AppointmentsService],
})
export class AppointmentsModule {}
