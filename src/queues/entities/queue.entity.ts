import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne, Unique } from 'typeorm';
import { Expose } from 'class-transformer';
import { BaseEntity } from '../../common/entities/base.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { Clinic } from '../../clinics/entities/clinic.entity';
import { DoctorProfile } from '../../doctors/entities/doctor-profile.entity';
import { QueueStatus } from '../enums/queue-status.enum';
import { combineDateAndTime, toDateString } from '../../common/utils/date-utils';
import { QueuePriorityGroup } from '../enums/queue-priority-group.enum';

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


  @Column({ type: 'enum', enum: QueueStatus, default: QueueStatus.WAITING })
  status!: QueueStatus;


  @Column({ name: 'checkin_time', type: 'timestamp', nullable: true })
  checkinTime!: Date | null;

  @Column({ name: 'started_time', type: 'timestamp', nullable: true })
  startedTime!: Date | null;

  @Column({ name: 'finished_time', type: 'timestamp', nullable: true })
  finishedTime!: Date | null;

  @Column({ name: 'called_at', type: 'timestamp', nullable: true })
  calledAt!: Date | null;

  @Column({ name: 'skipped_at', type: 'timestamp', nullable: true })
  skippedAt!: Date | null;

  @Column({
    name: 'priority_group',
    type: 'enum',
    enum: QueuePriorityGroup,
    default: QueuePriorityGroup.NORMAL,
  })
  priorityGroup!: QueuePriorityGroup;

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







  @Expose({ name: 'delay_from_appointment_minutes' })


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