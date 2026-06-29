export interface ReferralCreatedEventPayload {
  userId: number;
  referralId: number;
  expiresAt: string | null;
  doctorName: string | null;
  clinicName: string | null;
}

export class ReferralCreatedEvent {
  static readonly eventName = 'referral.created';

  constructor(public readonly payload: ReferralCreatedEventPayload) {}
}