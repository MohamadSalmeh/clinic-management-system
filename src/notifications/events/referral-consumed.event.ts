export interface ReferralConsumedEventPayload {
  userId: number;
  referralId: number;
  appointmentId: number;
}

export class ReferralConsumedEvent {
  static readonly eventName = 'notifications.referrals.consumed';

  constructor(public readonly payload: ReferralConsumedEventPayload) {}
}