import { DoctorInvitationsModule } from '../doctor-invitations/doctor-invitations.module';
import { DoctorsModule } from '../doctors/doctors.module';

import { forwardRef, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { getJwtConfig } from './config';
import { UsersModule } from '../users/users.module';
import { AdminsModule } from '../admins/admins.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthOptionalGuard, AuthRolesGuard, GoogleAuthGuard } from './guards';
import { AuthHelperProvider } from './providers';
import { GoogleStrategy } from './strategies';

@Module({
  imports: [
    AdminsModule,
    DoctorsModule,
    DoctorInvitationsModule,
    forwardRef(() => UsersModule),
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
    AuthRolesGuard,
    AuthOptionalGuard,
    GoogleAuthGuard,
    GoogleStrategy,
  ],
  exports: [JwtModule,AuthService],
})
export class AuthModule {}
