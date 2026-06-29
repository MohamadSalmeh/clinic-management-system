export interface WalletTopUpEventPayload {
  userId: number;
  walletId: number;
  transactionId: number;
  amount: string;
  balanceAfter: string;
}

export class WalletTopUpEvent {
  static readonly eventName = 'notifications.wallet.top_up';

  constructor(public readonly payload: WalletTopUpEventPayload) {}
}