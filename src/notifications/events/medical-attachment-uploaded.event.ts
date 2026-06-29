export interface MedicalAttachmentUploadedEventPayload {
  userId: number;
  attachmentIds: number[];
  source: 'history' | 'profile';
  appointmentId: number | null;
  medicalHistoryId: number | null;
}

export class MedicalAttachmentUploadedEvent {
  static readonly eventName = 'notifications.attachments.uploaded';

  constructor(public readonly payload: MedicalAttachmentUploadedEventPayload) {}
}