import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne, Unique } from 'typeorm';
import { Expose } from 'class-transformer';
import { BaseEntity } from '../../common/entities/base.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { User } from '../../users/entities/user.entity';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

@Entity({ name: 'payments' })
@Unique(['appointmentId'])
export class Payment extends BaseEntity {
  @Index()
  @Column({ name: 'appointment_id', type: 'bigint', nullable: true })
  appointmentId!: number | null;

  @Index()
  @Column({ name: 'wallet_id', type: 'bigint', nullable: true })
  walletId!: number | null;

  @Index()
  @Column({ name: 'user_id', type: 'bigint' })
  userId!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amount!: string;

  @Column({ name: 'payment_method', type: 'enum', enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @Column({ name: 'refund_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  refundAmount!: string;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'refunded_at', type: 'timestamp', nullable: true })
  refundedAt!: Date | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason!: string | null;

  @Expose({ name: 'human_readable_status' })
  get humanReadableStatus(): string {
    const statusMap: Record<PaymentStatus, string> = {
      [PaymentStatus.SUCCESS]: 'Success',
      [PaymentStatus.FAILED]: 'Failed',
      [PaymentStatus.PENDING]: 'Pending',
      [PaymentStatus.REFUNDED]: 'Refunded',
    };
    return statusMap[this.status] || 'Unknown';
  }

  @Expose({ name: 'net_paid_amount' })
  get netPaidAmount(): string {
    const amountVal = parseFloat(this.amount ?? '0');
    const refundVal = parseFloat(this.refundAmount ?? '0');
    return (amountVal - refundVal).toFixed(2);
  }

  
  @OneToOne(() => Appointment, (appointment) => appointment.payment, { nullable: true })
  @JoinColumn({ name: 'appointment_id' })
  appointment!: Appointment | null;

  @ManyToOne(() => Wallet, (wallet) => wallet.payments)
  @JoinColumn({ name: 'wallet_id' })
  wallet!: Wallet;

  @ManyToOne(() => User, (user) => user.payments)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
