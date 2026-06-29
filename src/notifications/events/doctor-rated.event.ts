export interface DoctorRatedEventPayload {
  userId: number;
  doctorProfileId: number;
  ratingId: number;
  score: number;
}

export class DoctorRatedEvent {
  static readonly eventName = 'notifications.ratings.new_rating';

  constructor(public readonly payload: DoctorRatedEventPayload) {}
}