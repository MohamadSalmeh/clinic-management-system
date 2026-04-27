import { forwardRef, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { getJwtConfig } from './config';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRolesGuard } from './guards';
import { AuthHelperProvider, AuthSessionProvider } from './providers';
import { GoogleStrategy } from './strategies';

@Module({
  imports: [
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
    AuthSessionProvider,
    AuthRolesGuard,
    GoogleStrategy,
  ],
  exports: [
    AuthService,
    AuthHelperProvider,
    AuthSessionProvider,
    AuthRolesGuard,
    JwtModule,
  ],
})
export class AuthModule {}
