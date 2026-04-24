import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicalProfileLog } from './entities/medical-profile-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MedicalProfileLog])],
  exports: [TypeOrmModule],
})
export class MedicalProfileLogsModule {}
