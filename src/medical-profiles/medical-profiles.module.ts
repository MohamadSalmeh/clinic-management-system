import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicalProfileLogsModule } from '../medical-profile-logs/medical-profile-logs.module';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { MedicalHistory } from '../medical-histories/entities/medical-history.entity';
import { MedicalProfile } from './entities/medical-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MedicalProfile,
      PatientProfile,
      MedicalHistory,
    ]),
    MedicalProfileLogsModule,
  ],
 
  exports: [ TypeOrmModule],
})
export class MedicalProfilesModule {}
