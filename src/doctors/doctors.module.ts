import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';

import { DoctorProfile } from './entities/doctor-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DoctorProfile]), UsersModule],
  exports: [ TypeOrmModule],
})
export class DoctorsModule {}
