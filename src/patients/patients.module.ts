import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth';
import { Appointment } from '../appointments/entities/appointment.entity';
import { MedicalProfile } from '../medical-profiles/entities/medical-profile.entity';
import { UsersModule } from '../users/users.module';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { PatientsController } from './patients.controller';
import { PatientProfile } from './entities/patient-profile.entity';
import { PatientAccessProvider } from './providers';
import { PatientsService } from './patients.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PatientProfile,
      MedicalProfile,
      Appointment,
      User,
      Wallet,
    ]),
    UsersModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [PatientsController],
  providers: [PatientsService, PatientAccessProvider],
  exports: [PatientsService, PatientAccessProvider],
})
export class PatientsModule {}
