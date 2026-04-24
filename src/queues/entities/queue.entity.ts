import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { Expose } from 'class-transformer';
import { BaseEntity } from '../../common/entities/base.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { Clinic } from '../../clinics/entities/clinic.entity';
import { DoctorProfile } from '../../doctors/entities/doctor-profile.entity';
import { QueueStatus } from '../enums/queue-status.enum';

@Entity({ name: 'queues' })
export class Queue extends BaseEntity {
  @Column({ name: 'appointment_id', type: 'bigint' })
  appointmentId!: number;

  @Column({ name: 'clinic_id', type: 'bigint' })
  clinicId!: number;

  @Column({ name: 'doctor_id', type: 'bigint' })
  doctorId!: number;

  @Column({ name: 'queue_date', type: 'date' })
  queueDate!: Date;

  @Column({ name: 'token_number', type: 'int' })
  tokenNumber!: number;

  @Column({ type: 'int', default: 1 })
  position!: number;

  @Column({ type: 'enum', enum: QueueStatus, default: QueueStatus.WAITING })
  status!: QueueStatus;

  @Column({ name: 'estimated_wait_minutes', type: 'int', default: 0 })
  estimatedWaitMinutes!: number;

  @Column({ name: 'checkin_time', type: 'timestamp', nullable: true })
  checkinTime!: Date | null;

  @Column({ name: 'called_time', type: 'timestamp', nullable: true })
  calledTime!: Date | null;

  @Column({ name: 'started_time', type: 'timestamp', nullable: true })
  startedTime!: Date | null;

  @Column({ name: 'finished_time', type: 'timestamp', nullable: true })
  finishedTime!: Date | null;

  @Column({ name: 'skipped_reason', type: 'text', nullable: true })
  skippedReason!: string | null;

  @Column({ name: 'is_priority', type: 'boolean', default: false })
  isPriority!: boolean;

  // Derived Properties
  @Expose({ name: 'waiting_time_minutes' })
  get waitingTimeMinutes(): number {
    if (this.calledTime && this.checkinTime) {
      const diffMs = this.calledTime.getTime() - this.checkinTime.getTime();
      return Math.max(Math.floor(diffMs / 60000), 0);
    }
    return 0;
  }

  @Expose({ name: 'queue_age_minutes' })
  get queueAgeMinutes(): number {
    if (this.created_at) {
      const now = new Date().getTime();
      const createdStr = new Date(this.created_at).getTime();
      const diffMs = now - createdStr;
      return Math.max(Math.floor(diffMs / 60000), 0);
    }
    return 0;
  }

  @Expose({ name: 'is_next' })
  get isNext(): boolean {
    return this.position === 2 && this.status === QueueStatus.WAITING; // Assuming position 1 is current
  }

  @Expose({ name: 'is_current' })
  get isCurrent(): boolean {
    return this.position === 1 && (this.status === QueueStatus.CALLED || this.status === QueueStatus.IN_PROGRESS);
  }

  @Expose({ name: 'is_overdue' })
  get isOverdue(): boolean {
    return this.queueAgeMinutes > (this.estimatedWaitMinutes || 0) && this.status === QueueStatus.WAITING;
  }

  @Expose({ name: 'queue_label' })
  get queueLabel(): string {
    const labels: Record<QueueStatus, string> = {
      [QueueStatus.WAITING]: 'Waiting',
      [QueueStatus.CALLED]: 'Called',
      [QueueStatus.IN_PROGRESS]: 'In Progress',
      [QueueStatus.COMPLETED]: 'Completed',
      [QueueStatus.SKIPPED]: 'Skipped',
    };
    return labels[this.status] || 'Unspecified';
  }

  // Relations
  @OneToOne(() => Appointment, (appointment) => appointment.queue)
  @JoinColumn({ name: 'appointment_id' })
  appointment!: Appointment;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinic_id' })
  clinic!: Clinic;

  @ManyToOne(() => DoctorProfile)
  @JoinColumn({ name: 'doctor_id' })
  doctor!: DoctorProfile;
}
