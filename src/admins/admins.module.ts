// filepath: src/admins/admins.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminProfile } from './entities/admin-profile.entity';
import { AdminsController } from './admins.controller';
import { AdminsService } from './admins.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminPatientsService } from './admin-patients.service';
import { AdminRatingsService } from './admin-ratings.service';
import { AdminReportsService } from './admin-reports.service';
import { AdminDoctorsService } from './admin-doctors.service';
import { DoctorInvitationsModule } from '../doctor-invitations/doctor-invitations.module';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth';
import { DoctorsModule } from '../doctors/doctors.module';
import { PatientsModule } from '../patients';
import { MedicalAttachmentsModule } from '../medical-attachments/medical-attachments.module';
import { Appointment } from '../appointments/entities/appointment.entity';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { Queue } from '../queues/entities/queue.entity';
import { Payment } from '../payments/entities/payment.entity';
import { DoctorScheduleRequest } from '../doctor-schedules/entities/doctor-schedule-request.entity';
import { Rating } from '../ratings/entities/rating.entity';
import { MedicalProfile } from '../medical-profiles/entities/medical-profile.entity';
import { MedicalHistory } from '../medical-histories/entities/medical-history.entity';
import { RatingReport } from '../ratings/entities/rating-report.entity';

@Module({
  imports: [
    // All TypeORM entities used across the module
    TypeOrmModule.forFeature([
      AdminProfile,
      User,
      Appointment,
      PatientProfile,
      DoctorProfile,
      Clinic,
      Queue,
      Payment,
      DoctorScheduleRequest,
      Rating,
      MedicalProfile,
      MedicalHistory,
      RatingReport,
    ]),
    // External modules
    DoctorInvitationsModule,
    DoctorsModule,
    PatientsModule,
    MedicalAttachmentsModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [AdminsController],
  providers: [
    AdminsService,
    AdminDashboardService,
    AdminPatientsService,
    AdminRatingsService,
    AdminReportsService,
    AdminDoctorsService,
  ],
  exports: [
    TypeOrmModule,
    AdminsService,
    AdminDashboardService,
    AdminPatientsService,
    AdminRatingsService,
    AdminReportsService,
    AdminDoctorsService,
  ],
})
export class AdminsModule {}
