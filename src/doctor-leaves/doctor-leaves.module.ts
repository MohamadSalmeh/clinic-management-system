import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorLeave } from './entities/doctor-leaves.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DoctorLeave])],
  exports: [TypeOrmModule],
})
export class DoctorLeavesModule {}
