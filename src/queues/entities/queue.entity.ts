import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne, Unique } from 'typeorm';
import { Expose } from 'class-transformer';
import { BaseEntity } from '../../common/entities/base.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { Clinic } from '../../clinics/entities/clinic.entity';
import { DoctorProfile } from '../../doctors/entities/doctor-profile.entity';
import { QueueStatus } from '../enums/queue-status.enum';

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

  @Expose({ name: 'waiting_time_minutes' })
  get waitingTimeMinutes(): number {
    if (this.startedTime && this.checkinTime) {
      const diffMs = this.startedTime.getTime() - this.checkinTime.getTime();
      return Math.max(Math.floor(diffMs / 60000), 0);
    }
    return 0;
  }
   
  @Expose({ name: 'is_next' })
  get isNext(): boolean {
    return this.position === 2 && this.status === QueueStatus.WAITING; 
  }

  @Expose({ name: 'is_current' })
  get isCurrent(): boolean {
    return this.position === 1 && (this.status === QueueStatus.IN_PROGRESS );
  }

@Expose({ name: 'queue_label' })
get queueLabel(): string {
  const labels: Record<QueueStatus, string> = {
    [QueueStatus.WAITING]: 'Waiting',
    [QueueStatus.IN_PROGRESS]: 'In Progress',
    [QueueStatus.COMPLETED]: 'Completed',
    [QueueStatus.SKIPPED]: 'Skipped',
  };
  return labels[this.status] || 'Unspecified';
}

  @Expose({ name: 'consultation_duration_minutes' })
get consultationDurationMinutes(): number {
  if (this.finishedTime && this.startedTime) {
    const diffMs = this.finishedTime.getTime() - this.startedTime.getTime();
    return Math.max(Math.floor(diffMs / 60000), 0);
  }
  return 0;
}

  @OneToOne(() => Appointment, (appointment) => appointment.queue)
  @JoinColumn({ name: 'appointment_id' })
  appointment!: Appointment;

  @ManyToOne(() => Clinic,(clinic)=>clinic.queues)
  @JoinColumn({ name: 'clinic_id' })
  clinic!: Clinic;


  @ManyToOne(() => DoctorProfile, (doctor) => doctor.queues)
  @JoinColumn({ name: 'doctor_id' })
  doctor!: DoctorProfile;

}
