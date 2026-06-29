export interface DoctorScheduleRequestRejectedEventPayload {
  userId: number;
  requestId: number;
}

export class DoctorScheduleRequestRejectedEvent {
  static readonly eventName = 'doctor.schedule.rejected';

  constructor(public readonly payload: DoctorScheduleRequestRejectedEventPayload) {}
}