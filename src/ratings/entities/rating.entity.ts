import { Check, Column, Entity, Index, JoinColumn, ManyToOne, OneToOne, Unique } from 'typeorm';
import { Expose } from 'class-transformer';
import { BaseEntity } from '../../common/entities/base.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { PatientProfile } from '../../patients/entities/patient-profile.entity';
import { User } from '../../users/entities/user.entity';
import { RatingStatus } from '../enums/rating-status.enum';
import { DoctorProfile } from '../../doctors/entities/doctor-profile.entity';

@Entity({ name: 'ratings' })
@Check('"score" >= 1 AND "score" <= 5')
@Unique(['appointmentId', 'patientProfileId'])
export class Rating extends BaseEntity {
  
 @Index()
 @Column({ name: 'patient_profile_id', type: 'bigint' })
  patientProfileId!: number;

  @Index()
  @Column({ name: 'doctor_profile_id', type: 'bigint' })
  doctorProfileId!: number;

  @Index()
  @Column({ name: 'appointment_id', type: 'bigint', nullable: true })
  appointmentId!: number | null;

  @Column({ type: 'smallint' ,nullable: true })
  score!: number|null;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @Column({ type: 'enum', enum: RatingStatus, default: RatingStatus.VISIBLE })
  status!: RatingStatus;

  // Derived Properties
  @Expose({ name: 'rating_label' })
  get ratingLabel(): string {
    if (this.score === 5) return 'Excellent';
    if (this.score === 4) return 'Very Good';
    if (this.score === 3) return 'Good';
    if (this.score === 2) return 'Acceptable';
    if (this.score === 1) return 'Poor';
    return 'Unrated';
  }

  @Expose({ name: 'is_positive' })
  get isPositive(): boolean {
    return this.score !== null && this.score >= 4;
  }

  @OneToOne(() => Appointment, (appointment) => appointment.rating, { nullable: true })
  @JoinColumn({ name: 'appointment_id' })
  appointment!: Appointment | null;

  @ManyToOne(() => PatientProfile, (patient) => patient.ratings)
  @JoinColumn({ name: 'patient_profile_id' }) 
  patientProfile!: PatientProfile;

  @ManyToOne(() => DoctorProfile, (doctor) => doctor.ratings)
  @JoinColumn({ name: 'doctor_profile_id' })
  doctorProfile!: DoctorProfile;
}
