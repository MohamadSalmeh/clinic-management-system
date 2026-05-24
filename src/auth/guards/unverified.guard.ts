import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { ActiveUserData, CURRENT_USER_KEY } from '../../utils';
import { User } from '../../users/entities/user.entity';

type RequestWithUser = Request & {
  [CURRENT_USER_KEY]?: ActiveUserData;
  userIsVerified?: boolean;
};

@Injectable()
export class UnverifiedGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const currentUser = request[CURRENT_USER_KEY];

    if (!currentUser?.sub) {
      throw new UnauthorizedException('Authenticated user is missing in request');
    }

    if (typeof request.userIsVerified === 'boolean') {
      if (request.userIsVerified) {
        throw new BadRequestException('Account is already verified');
      }

      return true;
    }

    const user = await this.userRepository.findOne({
      where: { id: Number(currentUser.sub) },
      select: ['id', 'isVerified'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Account is already verified');
    }

    return true;
  }
}
