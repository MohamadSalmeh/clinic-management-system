import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import {
    InjectRepository,
} from '@nestjs/typeorm';

import {
    Repository,
} from 'typeorm';

import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';

import { TopUpDto } from './dto/top-up.dto';

import { TransactionMethod } from './enums/transaction-method.enum';
import { TransactionStatus } from './enums/transaction-status.enum';

@Injectable()
export class TransactionsService {

    constructor(

        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,

        @InjectRepository(Wallet)
        private readonly walletRepository: Repository<Wallet>,

    ) {}

    async topUp(
        userId: number,
        dto: TopUpDto,
    ) {

        const wallet =
            await this.walletRepository.findOne({
                where: {
                    userId,
                },
            });

        if (!wallet) {
            throw new NotFoundException(
                'Wallet not found',
            );
        }

        wallet.availableBalance =
            (
                Number(wallet.availableBalance) +
                dto.amount
            ).toFixed(2);

        await this.walletRepository.save(wallet);

        const transaction =
            this.transactionRepository.create({

                userId,

                walletId: wallet.id,

                amount: dto.amount.toFixed(2),

                paymentMethod:
                    TransactionMethod.CARD,

                status:
                    TransactionStatus.SUCCESS,

                cardLast4:
                    dto.cardNumber.slice(-4),

            });

        await this.transactionRepository.save(
            transaction,
        );

        return wallet;

    }

}