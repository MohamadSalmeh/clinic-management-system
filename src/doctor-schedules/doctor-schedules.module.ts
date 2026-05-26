import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AuthModule } from '../auth/auth.module';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { UsersModule } from '../users/users.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { DoctorSchedulesController } from './doctor-schedules.controller';
import { DoctorSchedulesService } from './doctor-schedules.service';
import { DoctorSchedule } from './entities/doctor-schedule.entity';
import { DoctorScheduleRequest } from './entities/doctor-schedule-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DoctorSchedule,
      DoctorScheduleRequest,
      DoctorProfile,
      Appointment,
    ]),
    JwtModule,
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
    forwardRef(() => DoctorsModule),
  ],
  controllers: [DoctorSchedulesController],
  providers: [DoctorSchedulesService],
  exports: [TypeOrmModule, DoctorSchedulesService],
})
export class DoctorSchedulesModule {}
