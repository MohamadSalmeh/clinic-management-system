import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
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
import { DoctorInviteRegisterDto, LoginDto, RegisterDto } from './dto';
import { AuthOptionalGuard, AuthRolesGuard, GoogleAuthGuard } from './guards';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { GoogleUserData } from './strategies';

type GoogleAuthRequest = Request & {
  [CURRENT_USER_KEY]?: GoogleUserData;
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
  @UseGuards(AuthOptionalGuard)
  logout(): { message: string } {
    return this.authService.logout();
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

  @Get('me')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT)
  getMe(@CurrentUser() currentUser: ActiveUserData | undefined): ActiveUserData | undefined {
    return currentUser;
  }
}
