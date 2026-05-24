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
import { Logger } from '@nestjs/common';


import { Request, Response } from 'express';
import { CurrentUser, Public, Roles } from '../common/decorators';
import {
  ActiveUserData,
  AuthResponse,
  CURRENT_USER_KEY,
  UserRole,
} from '../utils';
import {
  ChangePasswordDto,
  DoctorInviteRegisterDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyAccountDto,
  VerifyResetCodeDto,
} from './dto';
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
  private readonly logger = new Logger(AuthService.name);
  constructor(private readonly authService: AuthService,

  ) { }

  @Post('register')
  @Public()
  async register(@Body() registerDto: RegisterDto): Promise<User> {
    this.logger.log('Reached register method');
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Public()
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
  @Public()
  async refresh(
    @Body('refreshToken') refreshToken: string,
  ): Promise<{ accessToken: string }> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    return this.authService.refreshToken(refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(200)
  @Public()
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto);
  }


  @Post('reset-password')
  @HttpCode(200)
  @Public()
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(dto);
  }

  @Post('verify-account')
  @HttpCode(200)
  @Public()
  async verifyAccount(
    @Body() dto: VerifyAccountDto,
  ): Promise<{ message: string }> {
    return this.authService.verifyAccount(dto);
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT)
  async changePassword(
    @CurrentUser() currentUser: ActiveUserData | undefined,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    if (!currentUser) {
      throw new UnauthorizedException('Authenticated user is missing in request');
    }

    return this.authService.changePassword(Number(currentUser.sub), dto);
  }


  @Post('resend-verification')
  @HttpCode(200)
  @Public()
  async resendVerification(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.resendVerification(dto);
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
  @Public()
  googleAuth(): void { }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @Public()
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
  @Public()
  async validateDoctorInvite(
    @Param('token') token: string,
  ): Promise<{ valid: true; email: string }> {
    return this.authService.validateDoctorInviteToken(token);
  }

  @Post('doctor-invite/:token/register')
  @Public()
  async registerDoctorFromInvite(
    @Param('token') token: string,
    @Body() dto: DoctorInviteRegisterDto,
  ): Promise<AuthResponse> {
    return this.authService.registerDoctorFromInvite(token, dto);
  }

  @Post('doctor-invite/:token/reject')
  @HttpCode(200)
  @Public()
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
