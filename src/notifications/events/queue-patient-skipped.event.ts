export interface QueuePatientSkippedEventPayload {
  userId: number;
  appointmentId: number;
  queueId: number;
  clinicName: string | null;
}

export class QueuePatientSkippedEvent {
  static readonly eventName = 'queue.patient_skipped';

  constructor(public readonly payload: QueuePatientSkippedEventPayload) {}
}