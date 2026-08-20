import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Queue } from './entities/queue.entity';
import { QueuesService } from './queues.service';
import { QueuesController } from './queues.controller';
import { AppointmentsModule } from '../appointments/appointments.module';
import { AuthModule } from '../auth'; // حل مشكلة الـ Guard
import { Clinic } from '../clinics/entities/clinic.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { SystemSetting } from '../system-setting/entities/system-setting.entity';
import { SystemSettingsService } from '../system-setting/system-settings.service';
import { DoctorSchedule } from '../doctor-schedules/entities/doctor-schedule.entity';
import { QueueTimeoutService } from './queue-timeout.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Queue,
      Appointment,
      Clinic,
      DoctorProfile,
      Wallet,
      Payment,
      SystemSetting,
      DoctorSchedule,
    ]),
    AuthModule,
    forwardRef(() => AppointmentsModule),
  ],
  controllers: [QueuesController],
  providers: [QueuesService,QueueTimeoutService],
  exports: [TypeOrmModule, QueuesService],
})
export class QueuesModule {}