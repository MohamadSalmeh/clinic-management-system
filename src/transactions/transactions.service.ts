import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';

import { TopUpDto } from './dto/top-up.dto';

import { TransactionMethod } from './enums/transaction-method.enum';
import { TransactionStatus } from './enums/transaction-status.enum';
import { WalletTopUpEvent } from '../notifications/events';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,

    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async topUp(userId: number, dto: TopUpDto) {
    const wallet = await this.walletRepository.findOne({
      where: {
        userId,
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    wallet.availableBalance = (
      Number(wallet.availableBalance) + dto.amount
    ).toFixed(2);

    await this.walletRepository.save(wallet);

    const transaction = this.transactionRepository.create({
      userId,

      walletId: wallet.id,

      amount: dto.amount.toFixed(2),

      paymentMethod: TransactionMethod.CARD,

      status: TransactionStatus.SUCCESS,

      cardLast4: dto.cardNumber.slice(-4),
    });

    const savedTransaction = await this.transactionRepository.save(transaction);

    await this.eventEmitter.emitAsync(
      WalletTopUpEvent.eventName,
      new WalletTopUpEvent({
        userId,
        walletId: wallet.id,
        transactionId: savedTransaction.id,
        amount: savedTransaction.amount,
        balanceAfter: wallet.availableBalance,
      }),
    );

    return wallet;
  }
  async getMyTransactions(
    userId: number,

    page: number,

    limit: number,
  ) {
    const [transactions, total] = await this.transactionRepository.findAndCount(
      {
        where: {
          userId,
        },

        order: {
          created_at: 'DESC',
        },

        skip: (page - 1) * limit,

        take: limit,
      },
    );

    return {
      data: transactions,

      total,

      page,

      limit,

      lastPage: Math.ceil(total / limit),
    };
  }
  async getTransactionById(
    userId: number,

    transactionId: number,
  ): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: {
        id: transactionId,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (Number(transaction.userId) !== Number(userId)) {
      throw new ForbiddenException(
        'You do not have access to this transaction',
      );
    }

    return transaction;
  }
  async getUserTransactions(
    userId: number,

    page: number,

    limit: number,
  ) {
    const [transactions, total] = await this.transactionRepository.findAndCount(
      {
        where: {
          userId,
        },

        order: {
          created_at: 'DESC',
        },

        skip: (page - 1) * limit,

        take: limit,
      },
    );

    return {
      data: transactions,

      total,

      page,

      limit,

      lastPage: Math.ceil(total / limit),
    };
  }
}
