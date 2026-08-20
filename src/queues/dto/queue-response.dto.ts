import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class QueueResponseDto {
  @Expose()
  id!: number;

  @Expose()
  appointmentId!: number;

  @Expose()
  clinicId!: number;

  @Expose()
  doctorId!: number;

  @Expose()
  currentPosition!: number | null;

  @Expose()
  patientsAhead!: number | null;

  @Expose()
  priorityGroup!: string;

  @Expose()
  status!: string;

  @Expose()
  checkInAt!: Date | null;

  @Expose()
  calledAt!: Date | null;

  @Expose()
  consultationStartedAt!: Date | null;

  @Expose()
  completedAt!: Date | null;

  @Expose()
  skippedAt!: Date | null;

  @Expose()
  expectedWaitingTimeMinutes!: number | null;

  @Expose()
  patientDelayMinutes!: number | null;

  @Expose()
  actualConsultationDurationMinutes!: number | null;

  @Expose()
  clinic: any;

  @Expose()
  doctor: any;

  @Expose()
  appointment: any;
}