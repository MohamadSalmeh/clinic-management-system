import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth';

import { Appointment } from '../appointments/entities/appointment.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { Wallet } from '../wallets/entities/wallet.entity';

import { Payment } from './entities/payment.entity';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({

    imports: [

        TypeOrmModule.forFeature([

            Payment,

            Appointment,

            Wallet,

            DoctorProfile,

        ]),

        AuthModule,

    ],

    controllers: [

        PaymentsController,

    ],

    providers: [

        PaymentsService,

    ],

    exports: [

        PaymentsService,

    ],

})
export class PaymentsModule {}