import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminProfile } from './entities/admin-profile.entity';
import { AdminsController } from './admins.controller';
import { AdminsService } from './admins.service';
import { DoctorInvitationsModule } from '../doctor-invitations/doctor-invitations.module';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminProfile, User]),
    DoctorInvitationsModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [AdminsController],
  providers: [AdminsService],
  exports: [TypeOrmModule, AdminsService],
})
export class AdminsModule {}
