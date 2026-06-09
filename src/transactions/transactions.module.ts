import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { AuthModule } from '../auth';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({

  imports: [

    TypeOrmModule.forFeature([

      Transaction,

      Wallet,

    ]),

    AuthModule,

  ],

  controllers: [

    TransactionsController,

  ],

  providers: [

    TransactionsService,

  ],

  exports: [

    TransactionsService,

  ],

})
export class TransactionsModule { }