import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth';
import { PatientsModule } from '../patients/patients.module';
import { Appointment } from './entities/appointment.entity';
import { AppointmentsController } from './appointments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment]), PatientsModule, AuthModule],
  controllers: [AppointmentsController],
  exports: [TypeOrmModule],
})
export class AppointmentsModule {}
