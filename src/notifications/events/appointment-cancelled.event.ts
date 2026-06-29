export interface AppointmentCancelledEventPayload {
  userId: number;
  appointmentId: number;
  exceptionDate: string;
  doctorName: string | null;
  clinicName: string | null;
}

export class AppointmentCancelledEvent {
  static readonly eventName = 'appointment.cancelled';

  constructor(public readonly payload: AppointmentCancelledEventPayload) {}
}