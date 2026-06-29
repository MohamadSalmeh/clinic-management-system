export interface DoctorScheduleRequestApprovedEventPayload {
  userId: number;
  requestId: number;
}

export class DoctorScheduleRequestApprovedEvent {
  static readonly eventName = 'doctor.schedule.approved';

  constructor(public readonly payload: DoctorScheduleRequestApprovedEventPayload) {}
}