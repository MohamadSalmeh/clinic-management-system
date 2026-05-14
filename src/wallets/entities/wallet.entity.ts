import { Expose } from 'class-transformer';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { Column, Entity, Index, JoinColumn, OneToOne, OneToMany } from 'typeorm';
import { WalletStatus } from '../enums/wallet-status.enum';

@Entity({ name: 'wallets' })
export class Wallet extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'bigint', unique: true })
  userId!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balance!: string;

  @Column({ name: 'locked_balance', type: 'decimal', precision: 15, scale: 2, default: 0 })
  lockedBalance!: string;

  @Column({ type: 'enum', enum: WalletStatus, default: WalletStatus.ACTIVE })
  status!: WalletStatus;

  @Expose({ name: 'available_balance' })
  get availableBalance(): string {
    const balance = Number(this.balance ?? 0);
    const lockedBalance = Number(this.lockedBalance ?? 0);
    return (balance - lockedBalance).toFixed(2);
  }

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => Payment, (payment) => payment.wallet)
  payments!: Payment[];

  @OneToMany(() => Transaction, (transaction) => transaction.wallet)
  transactions!: Transaction[];
}
