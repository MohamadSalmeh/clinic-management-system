export interface ReferralExpiringEventPayload {
  userId: number;
  referralId: number;
  expiresAt: string | null;
  doctorName: string | null;
  clinicName: string | null;
}

export class ReferralExpiringEvent {
  static readonly eventName = 'referral.expiring_soon';

  constructor(public readonly payload: ReferralExpiringEventPayload) {}
}