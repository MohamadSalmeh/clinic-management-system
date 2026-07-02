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
import { Wallet } from '../wallets/entities/wallet.entity';
import { SystemSetting } from '../system-setting/entities/system-setting.entity';
import { User } from '../users/entities/user.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PatientViolation } from '../patient-violations/entities/patient-violation.entity';
import { AppointmentsCron } from './appointments.cron';
import { ReferralsModule } from '../referrals/referrals.module';
import { SystemSettingsModule } from '../system-setting/system-settings.module';
import { WaitlistModule } from '../waitlists/waitlists.module';
import { Waitlist } from '../waitlists/entities/waitlist.entity';

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
      Wallet,
      SystemSetting,
      Payment,
      PatientViolation,
      User,
      Waitlist
    ]),
    AuthModule,
    MedicalProfilesModule,
    SystemSettingsModule,
    WaitlistModule,
    forwardRef(() => QueuesModule), // الإضافة هنا لربط موديول الـ Queue
    forwardRef(() => ReferralsModule)
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentsCron],
  exports: [TypeOrmModule, AppointmentsService],
})
export class AppointmentsModule { }
