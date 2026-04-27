import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { CurrentUser, Roles } from '../common/decorators';
import {
  ActiveUserData,
  AuthResponse,
  CURRENT_USER_KEY,
  UserRole,
} from '../utils';
import { LoginDto, RegisterDto } from './dto';
import { AuthRolesGuard } from './guards';
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

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth(): void {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() request: GoogleAuthRequest): Promise<AuthResponse> {
    const googleData = request[CURRENT_USER_KEY];

    if (!googleData) {
      throw new UnauthorizedException('Google authentication data is missing');
    }

    return this.authService.validateGoogleUser(googleData);
  }

  @Post('logout')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT)
  async logout(
    @CurrentUser() currentUser: ActiveUserData | undefined,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    if (!currentUser) {
      throw new UnauthorizedException('Authenticated user is missing in request');
    }

    const authorization = request.headers.authorization;
    const accessToken = this.extractTokenFromHeader(authorization);

    if (!accessToken) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    return this.authService.logout(Number(currentUser.sub), accessToken);
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

  @Delete('delete-account')
  @UseGuards(AuthRolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT)
  async deleteAccount(
    @CurrentUser() currentUser: ActiveUserData | undefined,
  ): Promise<{ message: string }> {
    if (!currentUser) {
      throw new UnauthorizedException('Authenticated user is missing in request');
    }

    return this.authService.deleteAccount(Number(currentUser.sub));
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
