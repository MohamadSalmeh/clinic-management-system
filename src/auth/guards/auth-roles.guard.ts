import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ROLES_KEY } from '../../common/decorators';
import { ActiveUserData, CURRENT_USER_KEY, UserRole } from '../../utils';

type RequestWithUser = Request & {
  [CURRENT_USER_KEY]?: ActiveUserData;
};

@Injectable()
export class AuthRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles =
      this.reflector.getAllAndOverride<readonly UserRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractTokenFromHeader(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }


    const jwtSecret = this.configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      throw new UnauthorizedException('Invalid token configuration');
    }

    const payload = await this.verifyToken(token, jwtSecret);
    request[CURRENT_USER_KEY] = payload;

    if (requiredRoles.length === 0) {
      return true;
    }

    const userRole = payload.usertype.toLowerCase() as UserRole;
    const hasRole = requiredRoles.some((role: UserRole): boolean => role === userRole);

    if (!hasRole) {
      throw new ForbiddenException('You do not have access to this resource');
    }

    return true;
  }

  private async verifyToken(
    token: string,
    secret: string,
  ): Promise<ActiveUserData> {
    try {
      const payload = await this.jwtService.verifyAsync<ActiveUserData>(token, {
        secret,
      });

      if (!payload?.sub || !payload?.email || !payload?.usertype) {
        throw new UnauthorizedException('Invalid token payload');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
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
