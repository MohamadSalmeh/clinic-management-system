import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';
import { Referral } from './entities/referral.entity';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { AppointmentsModule } from '../appointments/appointments.module'; // تأكد من صحة المسار
import { AuthModule } from '../auth';

@Module({
  imports: [
    TypeOrmModule.forFeature([Referral, PatientProfile, DoctorProfile]),
    AuthModule, 
    forwardRef(() => AppointmentsModule), // حل الاعتمادية الدائرية
  ],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService, TypeOrmModule], // تصدير السيرفيس لكي تستهلكها المواعيد لاحقاً
})
export class ReferralsModule {}