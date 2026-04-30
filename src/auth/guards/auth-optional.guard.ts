import {
    CanActivate,
    ExecutionContext,
    Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ActiveUserData, CURRENT_USER_KEY } from '../../utils';

type RequestWithUser = Request & {
    [CURRENT_USER_KEY]?: ActiveUserData;
};

@Injectable()
export class AuthOptionalGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<RequestWithUser>();
        const token = this.extractTokenFromHeader(request.headers.authorization);

        if (!token) {
            return true;
        }

        const jwtSecret = this.configService.get<string>('JWT_SECRET');

        if (!jwtSecret) {
            return true;
        }

        try {
            const payload = await this.jwtService.verifyAsync<ActiveUserData>(token, {
                secret: jwtSecret,
            });

            if (payload?.sub && payload?.email && payload?.usertype) {
                request[CURRENT_USER_KEY] = payload;
            }
        } catch {
            return true;
        }

        return true;
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
