import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth';
import { UsersModule } from '../users/users.module';
import { PatientsController } from './patients.controller';
import { PatientProfile } from './entities/patient-profile.entity';
import { PatientAccessProvider } from './providers';
import { PatientsService } from './patients.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PatientProfile]),
    UsersModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [PatientsController],
  providers: [PatientsService, PatientAccessProvider],
  exports: [PatientsService, PatientAccessProvider],
})
export class PatientsModule {}
