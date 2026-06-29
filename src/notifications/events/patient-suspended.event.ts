export interface PatientSuspendedEventPayload {
  userId: number;
  appointmentId: number;
  noShowCount: number;
  suspendedAt: string;
}

export class PatientSuspendedEvent {
  static readonly eventName = 'notifications.violations.suspended';

  constructor(public readonly payload: PatientSuspendedEventPayload) {}
}