export interface MedicalHistoryCreatedEventPayload {
  userId: number;
  medicalHistoryId: number;
  appointmentId: number;
  doctorName: string | null;
}

export class MedicalHistoryCreatedEvent {
  static readonly eventName = 'notifications.medical_history.created';

  constructor(public readonly payload: MedicalHistoryCreatedEventPayload) {}
}