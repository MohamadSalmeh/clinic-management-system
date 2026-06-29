import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicalProfileLog } from './entities/medical-profile-log.entity';
import { MedicalProfileLogsController } from './medical-profile-logs.controller';
import { MedicalProfileLogsService } from './medical-profile-logs.service';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { MedicalProfile } from '../medical-profiles/entities/medical-profile.entity';
import { AuthModule } from '../auth';
import { AppointmentAccessModule } from '../appointment-access/appointment-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MedicalProfileLog,
      PatientProfile,
      MedicalProfile,
    ]),
    AppointmentAccessModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [MedicalProfileLogsController],
  providers: [MedicalProfileLogsService],
  exports: [TypeOrmModule, MedicalProfileLogsService],
})
export class MedicalProfileLogsModule { }
