import { DoctorInvitationsModule } from '../doctor-invitations/doctor-invitations.module';
import { DoctorsModule } from '../doctors/doctors.module';

import { forwardRef, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getJwtConfig } from './config';
import { UsersModule } from '../users/users.module';
import { AdminsModule } from '../admins/admins.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  AuthOptionalGuard,
  AuthRolesGuard,
  GoogleAuthGuard,
  UnverifiedGuard,
  VerifiedGuard,
} from './guards';
import { AuthHelperProvider } from './providers';
import { GoogleStrategy } from './strategies';
import { OtpService } from './services/otp.service';
import { MailModule } from '../mail/mail.module';
import { MedicalProfilesModule } from '../medical-profiles/medical-profiles.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    AdminsModule,
    forwardRef(() => DoctorsModule),
    forwardRef(() => AdminsModule),
    DoctorsModule,
    DoctorInvitationsModule,
    forwardRef(() => UsersModule),
    forwardRef(() => MedicalProfilesModule),
    MailModule,
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ session: false }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: getJwtConfig,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthHelperProvider,
    OtpService,
    AuthRolesGuard,
    AuthOptionalGuard,
    VerifiedGuard,
    UnverifiedGuard,
    GoogleAuthGuard,
    GoogleStrategy,
  ],
  exports: [JwtModule, TypeOrmModule, AuthService, OtpService, AuthRolesGuard, VerifiedGuard],
})
export class AuthModule {}
