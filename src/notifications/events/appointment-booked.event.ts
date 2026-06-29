export interface AppointmentBookedEventPayload {
  userId: number;
  appointmentId: number;
  requestedDate: string;
  startTime: string;
  endTime: string;
  doctorName: string | null;
  clinicName: string | null;
}

export class AppointmentBookedEvent {
  static readonly eventName = 'appointment.booked';

  constructor(public readonly payload: AppointmentBookedEventPayload) {}
}