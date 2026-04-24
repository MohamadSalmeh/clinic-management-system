import { BaseEntity } from '../../common/entities/base.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { Clinic } from '../../clinics/entities/clinic.entity';
import { DoctorProfile } from '../../doctors/entities/doctor-profile.entity';
import { Check, Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity({ name: 'doctor_schedules' })
@Check('CHK_doctor_schedules_day_of_week_range', '"day_of_week" >= 0 AND "day_of_week" <= 6')
export class DoctorSchedule extends BaseEntity {
  @Column({ name: 'doctor_profile_id', type: 'bigint' })
  doctorProfileId!: number;

  @Column({ name: 'clinic_id', type: 'bigint' })
  clinicId!: number;

  @Column({ name: 'day_of_week', type: 'int' })
  dayOfWeek!: number;

  @Column({ name: 'start_time', type: 'time' })
  startTime!: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime!: string;

  @Column({
    name: 'is_booking_allowed',
    type: 'boolean',
    default: true
  })
  isBookingAllowed!: boolean;

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
