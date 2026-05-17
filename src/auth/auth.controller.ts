import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CurrentUser, Roles } from '../common/decorators';
import {
  ActiveUserData,
  AuthResponse,
  CURRENT_USER_KEY,
  UserRole,
} from '../utils';
import { DoctorInviteRegisterDto, LoginDto, RegisterDto, VerifyAccountDto } from './dto';
import { AuthRolesGuard, GoogleAuthGuard } from './guards';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { GoogleUserData } from './strategies';

type GoogleAuthRequest = Request & {
  [CURRENT_USER_KEY]?: GoogleUserData;
};

type AuthenticatedRequest = Request & {
  headers: Request['headers'] & {
    authorization?: string;
  };
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<User> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT)
  async logout(
    @CurrentUser() currentUser: ActiveUserData | undefined,
  ): Promise<{ message: string }> {
    if (!currentUser) {
      throw new UnauthorizedException('Authenticated user is missing in request');
    }

    return this.authService.logout(Number(currentUser.sub));
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body('refreshToken') refreshToken: string,
  ): Promise<{ accessToken: string }> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    return this.authService.refreshToken(refreshToken);
  }

  @Post('verify-account')
  @HttpCode(200)
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT)
  async verifyAccount(
    @CurrentUser() currentUser: ActiveUserData | undefined,
    @Body() dto: VerifyAccountDto,
  ): Promise<{ message: string }> {
    if (!currentUser) {
      throw new UnauthorizedException('Authenticated user is missing in request');
    }

    return this.authService.verifyAccount(Number(currentUser.sub), dto.code);
  }

  @Post('resend-verification')
  @HttpCode(200)
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT)
  async resendVerification(
    @CurrentUser() currentUser: ActiveUserData | undefined,
  ): Promise<{ message: string }> {
    if (!currentUser) {
      throw new UnauthorizedException('Authenticated user is missing in request');
    }

    return this.authService.resendVerification(Number(currentUser.sub));
  }

  @Get('status')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT)
  async getStatus(
    @CurrentUser() currentUser: ActiveUserData | undefined,
  ): Promise<{ isVerified: boolean; isProfileCompleted: boolean; role: UserRole }> {
    if (!currentUser) {
      throw new UnauthorizedException('Authenticated user is missing in request');
    }

    return this.authService.getAccountStatus(Number(currentUser.sub));
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth(): void {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(
    @Req() request: GoogleAuthRequest,
    @Res() res: Response,
  ): Promise<void> {
    const googleData = request[CURRENT_USER_KEY];

    if (!googleData) {
      throw new UnauthorizedException('Google authentication data is missing');
    }

    const inviteToken =
      typeof request.query.state === 'string'
        ? request.query.state
        : typeof request.query.inviteToken === 'string'
          ? request.query.inviteToken
          : undefined;

    const authResponse = await this.authService.validateGoogleUser(
      googleData,
      inviteToken,
    );

    res.status(200).json(authResponse);
  }

  @Get('doctor-invite/:token')
  async validateDoctorInvite(
    @Param('token') token: string,
  ): Promise<{ valid: true; email: string }> {
    return this.authService.validateDoctorInviteToken(token);
  }

  @Post('doctor-invite/:token/register')
  async registerDoctorFromInvite(
    @Param('token') token: string,
    @Body() dto: DoctorInviteRegisterDto,
  ): Promise<AuthResponse> {
    return this.authService.registerDoctorFromInvite(token, dto);
  }

  @Post('doctor-invite/:token/reject')
  @HttpCode(200)
  async rejectDoctorInvite(
    @Param('token') token: string,
  ): Promise<{ message: string }> {
    return this.authService.rejectDoctorInviteToken(token);
  }

  @Patch('deactivate-account')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT)
  async deactivateAccount(
    @CurrentUser() currentUser: ActiveUserData | undefined,
  ): Promise<User> {
    if (!currentUser) {
      throw new UnauthorizedException('Authenticated user is missing in request');
    }

    return this.authService.deactivateAccount(Number(currentUser.sub));
  }

  @Get('me')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT)
  getMe(@CurrentUser() currentUser: ActiveUserData | undefined): ActiveUserData | undefined {
    return currentUser;
  }

  private extractTokenFromHeader(authorization?: string): string | null {
    if (!authorization) {
      return null;
    }

    const [type, token] = authorization.split(' ');

    if (type !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}
