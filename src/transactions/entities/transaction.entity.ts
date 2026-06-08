import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { TransactionMethod } from '../enums/transaction-method.enum';
import { TransactionStatus } from '../enums/transaction-status.enum';

@Entity({ name: 'transactions' })
export class Transaction extends BaseEntity {
    @Index()
    @Column({ name: 'user_id', type: 'bigint' })
    userId!: number;

    @Index()
    @Column({ name: 'wallet_id', type: 'bigint' })
    walletId!: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    amount!: string;

    @Column({
        type: 'enum',
        enum: TransactionStatus,
        default: TransactionStatus.PENDING,
    })
    status!: TransactionStatus;

    @Column({ name: 'payment_method', type: 'enum', enum: TransactionMethod })
    paymentMethod!: TransactionMethod;

    @Column({
        name: 'card_last4',
        type: 'varchar',
        length: 4,
        nullable: true,
    })
    cardLast4!: string | null;
    
    @ManyToOne(() => User, (user) => user.transactions)
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @ManyToOne(() => Wallet, (wallet) => wallet.transactions)
    @JoinColumn({ name: 'wallet_id' })
    wallet!: Wallet;
}
