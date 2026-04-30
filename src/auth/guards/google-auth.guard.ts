import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext): Record<string, unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const inviteToken = request.query.inviteToken;

    if (typeof inviteToken === 'string' && inviteToken.length > 0) {
      return { state: inviteToken };
    }

    return {};
  }
}
