import { BaseEntity } from '../../common/entities/base.entity';
import { Clinic } from '../../clinics/entities/clinic.entity';
import { DoctorProfile } from '../../doctors/entities/doctor-profile.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DoctorScheduleType } from './doctor-schedule.entity';

export enum DoctorScheduleRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity({ name: 'doctor_schedule_requests' })
export class DoctorScheduleRequest extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Index()
  @Column({ name: 'doctor_profile_id', type: 'bigint' })
  doctorProfileId!: number;

  @Index()
  @Column({ name: 'clinic_id', type: 'bigint' })
  clinicId!: number;

  @Column({ name: 'day_of_week', type: 'int' })
  dayOfWeek!: number;

  @Column({ name: 'start_time', type: 'time' })
  startTime!: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime!: string;

  @Column({ type: 'enum', enum: DoctorScheduleType })
  type!: DoctorScheduleType;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes!: string | null;

  @Column({
    type: 'enum',
    enum: DoctorScheduleRequestStatus,
    default: DoctorScheduleRequestStatus.PENDING,
  })
  status!: DoctorScheduleRequestStatus;

  @ManyToOne(() => DoctorProfile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'doctor_profile_id' })
  doctorProfile!: DoctorProfile;

  @ManyToOne(() => Clinic, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'clinic_id' })
  clinic!: Clinic;
}
