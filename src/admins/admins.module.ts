import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminProfile } from './entities/admin-profile.entity';
import { AdminsController } from './admins.controller';
import { AdminsService } from './admins.service';
import { DoctorInvitationsModule } from '../doctor-invitations/doctor-invitations.module';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth';
import { DoctorsModule } from '../doctors/doctors.module';
import { PatientsModule } from '../patients';
import { MedicalAttachmentsModule } from '../medical-attachments/medical-attachments.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([AdminProfile, User]),
    DoctorInvitationsModule,
    DoctorsModule,
    PatientsModule,
    MedicalAttachmentsModule,
    forwardRef(() => AuthModule),

  ],
  controllers: [AdminsController],
  providers: [AdminsService],
  exports: [TypeOrmModule, AdminsService],
})
export class AdminsModule { }
