export interface DoctorInvitationCancelledEventPayload {
  userId: number;
  invitationId: number;
}

export class DoctorInvitationCancelledEvent {
  static readonly eventName = 'invitation.cancelled';

  constructor(public readonly payload: DoctorInvitationCancelledEventPayload) {}
}