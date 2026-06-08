import {
    Body,
    Controller,
    Post,
    UseGuards,
} from '@nestjs/common';

import {
    AuthRolesGuard,
    VerifiedGuard,
} from '../auth/guards';

import {
    CurrentUser,
    Roles,
} from '../common/decorators';

import {
    ActiveUserData,
    UserRole,
} from '../utils';

import { TransactionsService } from './transactions.service';
import { TopUpDto } from './dto/top-up.dto';

@Controller('transactions')
@UseGuards(AuthRolesGuard, VerifiedGuard)
export class TransactionsController {

    constructor(
        private readonly transactionsService: TransactionsService,
    ) { }

    @Post('top-up')
    @Roles(UserRole.PATIENT)
    topUp(

        @CurrentUser()
        currentUser: ActiveUserData,

        @Body()
        dto: TopUpDto,

    ) {

        return this.transactionsService.topUp(
            currentUser.sub,
            dto,
        );

    }

}