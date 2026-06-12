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
import {
    Get,
    Query,
    Param,
    ParseIntPipe,
} from '@nestjs/common';

import { GetMyTransactionsDto } from './dto/get-my-transactions.dto';

import { TransactionsService } from './transactions.service';
import { TopUpDto } from './dto/top-up.dto';

@Controller('transactions')
@UseGuards(AuthRolesGuard, VerifiedGuard)
export class TransactionsController {

    constructor(
        private readonly transactionsService: TransactionsService,
    ) { }
    @Get('me')
    @Roles(UserRole.PATIENT)
    getMyTransactions(

        @CurrentUser()
        currentUser: ActiveUserData,

        @Query()
        dto: GetMyTransactionsDto,

    ) {

        return this.transactionsService.getMyTransactions(

            currentUser.sub,

            dto.page,

            dto.limit,

        );

    }
    @Get(':id')
    @Roles(UserRole.PATIENT)
    getTransactionById(

        @CurrentUser()
        currentUser: ActiveUserData,

        @Param(
            'id',
            ParseIntPipe,
        )
        id: number,

    ) {

        return this.transactionsService.getTransactionById(

            currentUser.sub,

            id,

        );

    }
    @Get('user/:userId')
    @Roles(UserRole.ADMIN)
    getUserTransactions(

        @Param(
            'userId',
            ParseIntPipe,
        )
        userId: number,

        @Query()
        dto: GetMyTransactionsDto,

    ) {

        return this.transactionsService.getUserTransactions(

            userId,

            dto.page,

            dto.limit,

        );

    }

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