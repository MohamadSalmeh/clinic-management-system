import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { Appointment } from '../appointments/entities/appointment.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { DoctorLeave } from './entities/doctor-leaves.entity';
import { DoctorLeavesService } from './doctor-leaves.service';
import { DoctorLeavesController } from './doctor-leaves.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([DoctorLeave, DoctorProfile, Appointment]),
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [DoctorLeavesController],
  providers: [DoctorLeavesService],
  exports: [TypeOrmModule, DoctorLeavesService],
})
export class DoctorLeavesModule {}
