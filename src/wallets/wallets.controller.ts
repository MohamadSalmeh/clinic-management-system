import { Controller, Get, UseGuards } from '@nestjs/common';

import { AuthRolesGuard, VerifiedGuard } from '../auth/guards';

import { CurrentUser, Roles } from '../common/decorators';

import { ActiveUserData, UserRole } from '../utils';

import { WalletsService } from './wallets.service';
import { Wallet } from './entities/wallet.entity';

@Controller('wallets')
@UseGuards(AuthRolesGuard, VerifiedGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get('me')
  @Roles(UserRole.PATIENT)
  getMyWallet(@CurrentUser() currentUser: ActiveUserData): Promise<Wallet> {
    return this.walletsService.getMyWallet(currentUser.sub);
  }
}
