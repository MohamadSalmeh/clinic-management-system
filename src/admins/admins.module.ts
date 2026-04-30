import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getJwtConfig } from '../auth/config';
import { AdminProfile } from './entities/admin-profile.entity';
import { AdminsController } from './admins.controller';
import { AdminsService } from './admins.service';
import { AuthRolesGuard } from '../auth/guards';
import { DoctorInvitationsModule } from '../doctor-invitations/doctor-invitations.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminProfile, User]),
    DoctorInvitationsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: getJwtConfig,
    }),
  ],
  controllers: [AdminsController],
  providers: [AdminsService, AuthRolesGuard],
  exports: [TypeOrmModule, AdminsService],
})
export class AdminsModule {}
