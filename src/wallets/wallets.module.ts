import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth';
import { UsersModule } from '../users/users.module';

import { Wallet } from './entities/wallet.entity';
import { Transaction } from '../transactions/entities/transaction.entity';

import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, Transaction]),
    UsersModule,
    AuthModule,
  ],
  controllers: [WalletsController],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
