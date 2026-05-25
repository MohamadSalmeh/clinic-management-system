import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth';
import { PatientsModule } from '../patients/patients.module';
import { UsersModule } from '../users/users.module';
import { Wallet } from './entities/wallet.entity';
import { WalletsController } from './wallets.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet]), UsersModule, PatientsModule, AuthModule],
  controllers: [WalletsController],
  exports: [TypeOrmModule],
})
export class WalletsModule {}
