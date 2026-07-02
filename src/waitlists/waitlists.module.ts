import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WaitlistController } from './waitlists.controller';
import { WaitlistService } from './waitlists.service';

import { Waitlist } from './entities/waitlist.entity';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { DoctorSchedule } from '../doctor-schedules/entities/doctor-schedule.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { DoctorLeave } from '../doctor-leaves/entities/doctor-leaves.entity';
import { Notification } from '../notifications/entities/notification.entity';

import { SystemSettingsModule } from '../system-setting/system-settings.module';
import { AuthModule } from '../auth';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Waitlist,
            PatientProfile,
            DoctorProfile,
            DoctorSchedule,
            Appointment,
            DoctorLeave,
            Notification,
        ]),
        SystemSettingsModule,
        AuthModule
    ],
    controllers: [WaitlistController],
    providers: [WaitlistService],
    exports: [WaitlistService],
})
export class WaitlistModule { }