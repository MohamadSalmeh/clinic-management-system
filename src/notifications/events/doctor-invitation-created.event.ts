export interface DoctorInvitationCreatedEventPayload {
  userId: number;
  invitationId: number;
  expiresAt: string;
}

export class DoctorInvitationCreatedEvent {
  static readonly eventName = 'invitation.created';

  constructor(public readonly payload: DoctorInvitationCreatedEventPayload) {}
}