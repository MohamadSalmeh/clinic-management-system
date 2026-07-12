export interface AppointmentCompletedEventPayload {
  userId: number;
  appointmentId: number;
  queueId: number | null;
  clinicName: string | null;
}

export class AppointmentCompletedEvent {
  static readonly eventName = 'notifications.appointments.completed';

  constructor(public readonly payload: AppointmentCompletedEventPayload) {}
}