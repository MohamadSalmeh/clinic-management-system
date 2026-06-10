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
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { ROLES_KEY } from '../../common/decorators';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator'; 
import { ActiveUserData, CURRENT_USER_KEY, UserRole } from '../../utils';
import { User } from '../../users/entities/user.entity';

type RequestWithUser = Request & {
  [CURRENT_USER_KEY]?: ActiveUserData;
  userIsVerified?: boolean;
};

@Injectable()
export class AuthRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 👈 1. الفحص الذكي: هل الـ Endpoint أو الكلاس تم تعليمها كـ Public؟
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // نعم عامة! اسمح بالمرور فوراً وتخطى كل فحوصات التوكن والأمان المتواجدة بالأسفل
    }

    // 2. جلب الأدوار المطلوبة للـ Endpoints المحمية
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

    const user = await this.userRepository.findOne({
      where: { id: Number(payload.sub) },
      select: ['id', 'tokenVersion', 'isVerified'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (payload.version < user.tokenVersion) {
      throw new UnauthorizedException('Token has been revoked');
    }

    request[CURRENT_USER_KEY] = payload;
    request.userIsVerified = user.isVerified;

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

      if (
        !payload?.sub ||
        !payload?.usertype ||
        typeof payload.version !== 'number'
      ) {
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
