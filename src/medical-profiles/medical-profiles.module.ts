import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicalProfileLogsModule } from '../medical-profile-logs/medical-profile-logs.module';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { AuthModule } from '../auth';
import { MedicalProfile } from './entities/medical-profile.entity';
import { MedicalProfilesController } from './medical-profiles.controller';
import { MedicalProfilesService } from './medical-profiles.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MedicalProfile, PatientProfile]),
    MedicalProfileLogsModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [MedicalProfilesController],
  providers: [MedicalProfilesService],
  exports: [TypeOrmModule, MedicalProfilesService],
})
export class MedicalProfilesModule {}
