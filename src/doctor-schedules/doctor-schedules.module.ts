import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorSchedule } from './entities/doctor-schedule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DoctorSchedule])],
  exports: [TypeOrmModule],
})
export class DoctorSchedulesModule {}
