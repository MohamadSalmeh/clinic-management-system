export interface AppointmentNoShowEventPayload {
  userId: number;
  appointmentId: number;
  createdBy: 'SYSTEM' | 'DOCTOR';
  noShowCount: number;
}

export class AppointmentNoShowEvent {
  static readonly eventName = 'notifications.appointments.no_show';

  constructor(public readonly payload: AppointmentNoShowEventPayload) {}
}