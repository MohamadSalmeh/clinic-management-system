export interface DoctorInvitationRejectedEventPayload {
  userId: number;
  invitationId: number;
}

export class DoctorInvitationRejectedEvent {
  static readonly eventName = 'invitation.rejected';

  constructor(public readonly payload: DoctorInvitationRejectedEventPayload) {}
}