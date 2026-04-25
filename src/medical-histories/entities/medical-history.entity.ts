import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { MedicalProfile } from '../../medical-profiles/entities/medical-profile.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';

@Entity({ name: 'medical_histories' })
export class MedicalHistory extends BaseEntity {
  @Column({ name: 'medical_profile_id', type: 'bigint' })
  medicalProfileId!: number;

  @Column({ name: 'appointment_id', type: 'bigint' })
  appointmentId!: number;

  @Column({ name: 'diagnosis', type: 'text' })
  diagnosis!: string;

  @Column({ name: 'prescriptions', type: 'jsonb', nullable: true })
  prescriptions!: any;

  @Column({ name: 'doctor_notes', type: 'text', nullable: true })
  doctorNotes!: string | null;

  @ManyToOne(() => MedicalProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'medical_profile_id' })
  medicalProfile!: MedicalProfile;

  @OneToOne(() => Appointment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appointment_id' })
  appointment!: Appointment;
}
