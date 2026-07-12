export interface QueuePatientCalledEventPayload {
  userId: number;
  appointmentId: number;
  queueId: number | null;
  clinicName: string | null;
}

export class QueuePatientCalledEvent {
  static readonly eventName = 'queue.patient_called';

  constructor(public readonly payload: QueuePatientCalledEventPayload) { }
}