import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { Expose } from 'class-transformer';
import { BaseEntity } from '../../common/entities/base.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { User } from '../../users/entities/user.entity';
import { PaymentType } from '../enums/payment-type.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

@Entity({ name: 'payments' })
export class Payment extends BaseEntity {
  @Column({ name: 'appointment_id', type: 'bigint' })
  appointmentId!: number;

  @Column({ name: 'wallet_id', type: 'bigint' })
  walletId!: number;

  @Column({ name: 'payer_user_id', type: 'bigint' })
  payerUserId!: number;

  @Column({ name: 'payee_user_id', type: 'bigint' })
  payeeUserId!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amount!: string;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency!: string;

  @Column({ name: 'payment_type', type: 'enum', enum: PaymentType })
  paymentType!: PaymentType;

  @Column({ name: 'payment_method', type: 'enum', enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @Column({ name: 'transaction_reference', type: 'varchar', length: 255, nullable: true })
  transactionReference!: string | null;

  @Column({ name: 'due_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  dueAmount!: string;

  @Column({ name: 'refund_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  refundAmount!: string;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'refunded_at', type: 'timestamp', nullable: true })
  refundedAt!: Date | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason!: string | null;

  // Derived Properties (يتم حسابها وقت العرض باستخدام Expose)
  
  @Expose({ name: 'remaining_amount' })
  get remainingAmount(): string {
    const amountVal = parseFloat(this.amount ?? '0');
    // Assuming remaining is part of dueAmount or it was meant to be totalAmount - amount.
    // Based on user prompt: total_amount - amount. Let's use dueAmount if total_amount is not defined,
    // or just assume dueAmount is the total amount for now? Wait, the prompt says: "(total_amount - amount)".
    // So due_amount might be "total_amount"? The user says due_amount is "المبلغ المتبقي".
    // Wait, the prompt said: "due_amount: المبلغ المتبقي (إذا كان الدفع جزئي)."
    // And then "remaining_amount: المبلغ المتبقي (total_amount - amount)." There could be a typo. Let's calculate it:
    return this.dueAmount ?? '0';
  }

  @Expose({ name: 'is_partial' })
  get isPartial(): boolean {
    return parseFloat(this.remainingAmount) > 0;
  }

  @Expose({ name: 'is_completed' })
  get isCompleted(): boolean {
    return parseFloat(this.remainingAmount) === 0 && this.status === PaymentStatus.SUCCESS;
  }

  @Expose({ name: 'is_refundable' })
  get isRefundable(): boolean {
    return this.status === PaymentStatus.SUCCESS && parseFloat(this.amount) > parseFloat(this.refundAmount);
  }

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

  // Relations
  @OneToOne(() => Appointment, (appointment) => appointment.payment)
  @JoinColumn({ name: 'appointment_id' })
  appointment!: Appointment;

  @ManyToOne(() => Wallet, (wallet) => wallet.payments)
  @JoinColumn({ name: 'wallet_id' })
  wallet!: Wallet;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'payer_user_id' })
  payerUser!: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'payee_user_id' })
  payeeUser!: User;
}
