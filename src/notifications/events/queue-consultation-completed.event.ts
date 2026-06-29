export interface QueueConsultationCompletedEventPayload {
  userId: number;
  appointmentId: number;
  queueId: number;
  clinicName: string | null;
}

export class QueueConsultationCompletedEvent {
  static readonly eventName = 'queue.consultation_completed';

  constructor(public readonly payload: QueueConsultationCompletedEventPayload) {}
}