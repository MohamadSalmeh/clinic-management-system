export interface MedicinePrescribedEventPayload {
  userId: number;
  medicineId: number;
  medicineName: string;
  medicalHistoryId: number | null;
  appointmentId: number | null;
}

export class MedicinePrescribedEvent {
  static readonly eventName = 'notifications.medicines.prescribed';

  constructor(public readonly payload: MedicinePrescribedEventPayload) {}
}