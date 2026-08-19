import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne, Unique } from 'typeorm';
import { Expose } from 'class-transformer';
import { BaseEntity } from '../../common/entities/base.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { Clinic } from '../../clinics/entities/clinic.entity';
import { DoctorProfile } from '../../doctors/entities/doctor-profile.entity';
import { QueueStatus } from '../enums/queue-status.enum';
import { combineDateAndTime, toDateString } from '../../common/utils/date-utils';

@Entity({ name: 'queues' })
@Unique(['appointmentId'])
export class Queue extends BaseEntity {
  @Index()
  @Column({ name: 'appointment_id', type: 'bigint' })
  appointmentId!: number;

  @Index()
  @Column({ name: 'clinic_id', type: 'bigint' })
  clinicId!: number;

  @Index()
  @Column({ name: 'doctor_id', type: 'bigint' })
  doctorId!: number;

  @Column({ type: 'int' })
  position!: number;

  @Column({ type: 'enum', enum: QueueStatus, default: QueueStatus.WAITING })
  status!: QueueStatus;

  @Column({ name: 'estimated_wait_minutes', type: 'int', default: 0 })
  estimatedWaitMinutes!: number;

  @Column({ name: 'checkin_time', type: 'timestamp', nullable: true })
  checkinTime!: Date | null;

  @Column({ name: 'started_time', type: 'timestamp', nullable: true })
  startedTime!: Date | null;

  @Column({ name: 'finished_time', type: 'timestamp', nullable: true })
  finishedTime!: Date | null;

  @Column({ name: 'is_priority', type: 'boolean', default: false })
  isPriority!: boolean;

  @Column({
    name: 'actual_duration_minutes',
    type: 'int',
    nullable: true,
    default: null,
  })
  actualDurationMinutes!: number | null;

  // ============================================================
  // ✅ Virtual (computed) fields exposed to API responses
  // ============================================================

  @Expose({ name: 'waiting_time_minutes' })
  get waitingTimeMinutes(): number {
    if (this.checkinTime) {
      const end = this.startedTime ?? new Date();
      const diffMs = end.getTime() - this.checkinTime.getTime();
      return Math.max(Math.floor(diffMs / 60000), 0);
    }
    return 0;
  }

  @Expose({ name: 'is_next' })
  isNext: boolean = false;

  @Expose({ name: 'is_current' })
  get isCurrent(): boolean {
    return this.position === 1 && this.status === QueueStatus.IN_PROGRESS;
  }

  @Expose({ name: 'queue_label' })
  get queueLabel(): string {
    const labels: Record<QueueStatus, string> = {
      [QueueStatus.WAITING]: 'Waiting',
      [QueueStatus.CALLING]: 'Calling',
      [QueueStatus.IN_PROGRESS]: 'In Progress',
      [QueueStatus.COMPLETED]: 'Completed',
      [QueueStatus.SKIPPED]: 'Skipped',
      [QueueStatus.EXPIRED]: 'Expired',
      [QueueStatus.NO_SHOW]: 'No Show',
    };
    return labels[this.status] || 'Unspecified';
  }

  @Expose({ name: 'consultation_duration_minutes' })
  get consultationDurationMinutes(): number {
    if (this.startedTime) {
      const end = this.finishedTime ?? new Date();
      const diffMs = end.getTime() - this.startedTime.getTime();
      return Math.max(Math.floor(diffMs / 60000), 0);
    }
    return 0;
  }

  @Expose({ name: 'delay_from_appointment_minutes' })
  get delayFromAppointmentMinutes(): number {
    if (!this.appointment?.requestedDate) return 0;

    // ✅ تحويل requestedDate إلى string إذا كان من نوع Date
    const requestedDateStr = typeof this.appointment.requestedDate === 'string'
      ? this.appointment.requestedDate
      : toDateString(this.appointment.requestedDate);

    const scheduled = combineDateAndTime(
      requestedDateStr,
      this.appointment.startTime,
    );

    if (this.startedTime) {
      const diffMins = Math.round(
        (this.startedTime.getTime() - scheduled.getTime()) / 60000,
      );
      return diffMins > 0 ? diffMins : 0;
    }

    const waitTime = this.estimatedWaitMinutes || 0;
    const expectedStartTime = Date.now() + waitTime * 60000;
    const diffMins = Math.round(
      (expectedStartTime - scheduled.getTime()) / 60000,
    );
    return diffMins > 0 ? diffMins : 0;
  }

  // ============================================================
  // ✅ Relations
  // ============================================================

  @OneToOne(() => Appointment, (appointment) => appointment.queue)
  @JoinColumn({ name: 'appointment_id' })
  appointment!: Appointment;

  @ManyToOne(() => Clinic, (clinic) => clinic.queues)
  @JoinColumn({ name: 'clinic_id' })
  clinic!: Clinic;

  @ManyToOne(() => DoctorProfile, (doctor) => doctor.queues)
  @JoinColumn({ name: 'doctor_id' })
  doctor!: DoctorProfile;
}