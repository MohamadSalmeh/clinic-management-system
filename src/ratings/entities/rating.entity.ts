import { Check, Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { Expose } from 'class-transformer';
import { BaseEntity } from '../../common/entities/base.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { PatientProfile } from '../../patients/entities/patient-profile.entity';
import { User } from '../../users/entities/user.entity';
import { RatingStatus } from '../enums/rating-status.enum';

@Entity({ name: 'ratings' })
@Check('"score" >= 1 AND "score" <= 5')
export class Rating extends BaseEntity {
  
  @Column({ name: 'patient_user_id', type: 'bigint' })
  patientUserId!: number;

  @Column({ name: 'doctor_user_id', type: 'bigint' })
  doctorUserId!: number;

  @Column({ name: 'appointment_id', type: 'bigint' })
  appointmentId!: number;

  @Column({ type: 'smallint' })
  score!: number;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @Column({ type: 'enum', enum: RatingStatus, default: RatingStatus.PENDING })
  status!: RatingStatus;

  // Derived Properties
  @Expose({ name: 'rating_label' })
  get ratingLabel(): string {
    if (this.score === 5) return 'Excellent';
    if (this.score === 4) return 'Very Good';
    if (this.score === 3) return 'Good';
    if (this.score === 2) return 'Acceptable'; // or Fair/Satisfactory
    if (this.score === 1) return 'Poor';
    return 'Unrated';
  }

  @Expose({ name: 'is_positive' })
  get isPositive(): boolean {
    return this.score >= 4;
  }

  @Expose({ name: 'is_verified_rating' })
  get isVerifiedRating(): boolean {
    // Basic verification logic, normally this could check if appointment was COMPLETED
    return !!this.appointmentId && this.status !== RatingStatus.DELETED;
  }

  @Expose({ name: 'weighted_score' })
  get weightedScore(): string {
    // Weighted score can be just the score for now, maybe * 1.0 or something
    return (this.score * 1.0).toFixed(2);
  }

  // Relations
  @OneToOne(() => Appointment, (appointment) => appointment.rating)
  @JoinColumn({ name: 'appointment_id' })
  appointment!: Appointment;

  @ManyToOne(() => PatientProfile, (patient) => patient.ratings)
  @JoinColumn({ name: 'patient_id' }) // Notice: the schema says patient_user_id was intended, but standard approach was to link PatientProfile
  patient!: PatientProfile;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'patient_user_id' })
  patientUser!: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'doctor_user_id' })
  doctorUser!: User;
}
