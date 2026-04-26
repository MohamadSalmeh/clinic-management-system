import { BaseEntity } from '../../common/entities/base.entity';
import { Clinic } from '../../clinics/entities/clinic.entity';
import { DoctorSchedule } from '../../doctor-schedules/entities/doctor-schedule.entity';
import { DoctorProfile } from '../../doctors/entities/doctor-profile.entity';
import { PatientProfile } from '../../patients/entities/patient-profile.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { MedicalProfileLog } from '../../medical-profile-logs/entities/medical-profile-log.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Rating } from '../../ratings/entities/rating.entity';
import { Queue } from '../../queues/entities/queue.entity';
import { Check, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { MedicalHistory } from '../../medical-histories/entities/medical-history.entity';
import { Referral } from '../../referrals/entities/referral.entity';

@Entity({ name: 'appointments' })
@Check(`"end_time" > "start_time"`)
export class Appointment extends BaseEntity {
  @Index()
  @Column({ name: 'patient_id', type: 'bigint' })
  patientId!: number;

  @Index()
  @Column({ name: 'doctor_id', type: 'bigint' })
  doctorId!: number;

  @Index()
  @Column({ name: 'clinic_id', type: 'bigint' })
  clinicId!: number;

  @Index()
  @Column({ name: 'scheduling_id', type: 'bigint' })
  schedulingId!: number;

  @Column({ type: 'varchar', length: 100 })
  type!: string;

  @Column({ type: 'enum', enum: ['1', '2'] })
  priority!: string;

  @Column({ type: 'enum', enum: ['confirmed', 'cancelled', 'completed', 'no_show'] })
  status!: string;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: ['paid', 'unpaid', 'partial', 'refunded'],
  })
  paymentStatus!: string;

  @Column({ name: 'requested_date', type: 'date' })
  requestedDate!: Date;

  @Column({ name: 'start_time', type: 'time' })
  startTime!: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime!: string;

  @Column({ name: 'actual_start_time', type: 'timestamp', nullable: true })
  actualStartTime!: Date | null;

  @Column({ name: 'actual_end_time', type: 'timestamp', nullable: true })
  actualEndTime!: Date | null;

  @Column({ name: 'reason_for_visit', type: 'text', nullable: true })
  reasonForVisit!: string | null;

  @Column({ type: 'text', nullable: true })
  symptoms!: string | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason!: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'checkin_time', type: 'timestamp', nullable: true })
  checkinTime!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @ManyToOne(() => PatientProfile, (patient) => patient.appointments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patient_id' })
  patient!: PatientProfile;

  @ManyToOne(() => DoctorProfile, (doctor) => doctor.appointments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: DoctorProfile;

  @ManyToOne(() => Clinic, (clinic) => clinic.appointments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'clinic_id' })
  clinic!: Clinic;

  @ManyToOne(() => DoctorSchedule, (schedule) => schedule.appointments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'scheduling_id' })
  scheduling!: DoctorSchedule;

  @OneToMany(() => Notification, (notification) => notification.appointment)
  notifications!: Notification[];

  @OneToMany(() => MedicalHistory, (history) => history.appointment)
  medicalHistory!: MedicalHistory[];

  @OneToOne(() => Payment, (payment) => payment.appointment)
  payment!: Payment;

  @OneToOne(() => Rating, (rating) => rating.appointment)
  rating!: Rating;

  @OneToOne(() => Queue, (queue) => queue.appointment)
  queue!: Queue;

  @OneToOne(() => Referral, (referral) => referral.appointment)
  referral!: Referral;
}
