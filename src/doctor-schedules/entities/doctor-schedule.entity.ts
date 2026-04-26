import { BaseEntity } from '../../common/entities/base.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { Clinic } from '../../clinics/entities/clinic.entity';
import { DoctorProfile } from '../../doctors/entities/doctor-profile.entity';
import { ColumnNumericTransformer } from '../../common/transformers/column-numeric.transformer';
import { Check, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

export enum DoctorScheduleType {
  NORMAL = 'NORMAL',
  BREAK = 'BREAK',
  EMERGENCY = 'EMERGENCY',
}

@Entity({ name: 'doctor_schedules' })
@Check('CHK_doctor_schedules_day_of_week_range', '"day_of_week" >= 0 AND "day_of_week" <= 6')
@Check('CHK_doctor_schedules_end_time_after_start_time', '"end_time" > "start_time"')
export class DoctorSchedule extends BaseEntity {
  @Index()
  @Column({
    name: 'doctor_profile_id',
    type: 'bigint',
    transformer: new ColumnNumericTransformer(),
  })
  doctorProfileId!: number;

  @Index()
  @Column({
    name: 'clinic_id',
    type: 'bigint',
    transformer: new ColumnNumericTransformer(),
  })
  clinicId!: number;

  @Column({ name: 'day_of_week', type: 'int' })
  dayOfWeek!: number;

  @Column({ name: 'start_time', type: 'time' })
  startTime!: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime!: string;

  @Column({
    type: 'enum',
    enum: DoctorScheduleType,
    default: DoctorScheduleType.NORMAL,
  })
  type!: DoctorScheduleType;


  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

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

  @OneToMany(() => Appointment, (appointment) => appointment.scheduling)
  appointments!: Appointment[];
}
