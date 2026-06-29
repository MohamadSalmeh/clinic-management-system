export interface ReferralCancelledEventPayload {
  userId: number;
  referralId: number;
}

export class ReferralCancelledEvent {
  static readonly eventName = 'referral.cancelled';

  constructor(public readonly payload: ReferralCancelledEventPayload) {}
}