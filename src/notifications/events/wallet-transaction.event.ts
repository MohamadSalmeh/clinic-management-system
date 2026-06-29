export type WalletTransactionAction = 'FREEZE' | 'REFUND';

export interface WalletTransactionEventPayload {
  userId: number;
  appointmentId: number;
  action: WalletTransactionAction;
  amount: string;
  balanceAfter: string;
}

export class WalletTransactionEvent {
  static readonly eventName = 'notifications.wallet.transaction';

  constructor(public readonly payload: WalletTransactionEventPayload) {}
}