import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
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

import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { MyPaymentQueryDto } from './dto/payment-query.dto';

@Controller('payments')
@UseGuards(AuthRolesGuard, VerifiedGuard)
export class PaymentsController {

    constructor(
        private readonly paymentsService: PaymentsService,
    ) { }

    @Get('my')
    @Roles(UserRole.PATIENT)
    getMyPayments(
        @CurrentUser() currentUser: ActiveUserData,
        @Query() query: MyPaymentQueryDto,
    ) {
        return this.paymentsService.getMyPayments(
            currentUser.sub,
            query,
        );
    }
    /* @Post('pay-appointment/:appointmentId')
     @Roles(UserRole.PATIENT)
     payAppointment(
 
         @CurrentUser()
         currentUser: ActiveUserData,
 
         @Param(
             'appointmentId',
             ParseIntPipe,
         )
         appointmentId: number,
 
     ): Promise<Payment> {
 
         return this.paymentsService.payAppointment(
             currentUser.sub,
             appointmentId,
         );
 
     }*/

}