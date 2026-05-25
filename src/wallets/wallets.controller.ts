import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthRolesGuard, VerifiedGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { ActiveUserData, UserRole } from '../utils';
import { PatientsService, PatientWalletSummary } from '../patients/patients.service';

@Controller('wallets')
@UseGuards(AuthRolesGuard, VerifiedGuard)
export class WalletsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get('me')
  @Roles(UserRole.PATIENT)
  async getWallet(
    @CurrentUser() currentUser: ActiveUserData,
  ): Promise<PatientWalletSummary | null> {
    return this.patientsService.getWallet(currentUser.sub);
  }
}
