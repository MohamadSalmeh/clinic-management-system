import { BaseEntity } from '../../common/entities/base.entity';
import { PatientProfile } from '../../patients/entities/patient-profile.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { MedicalProfileLog } from '../../medical-profile-logs/entities/medical-profile-log.entity';
import { PregnancyStatus } from '../enums/pregnancy-status.enum';

@Entity({ name: 'medical_profiles' })
export class MedicalProfile extends BaseEntity {
  @Column({ name: 'patient_profile_id', type: 'bigint', unique: true })
  patientProfileId!: number;

  @Column({ name: 'blood_type', type: 'varchar', length: 10, nullable: true })
  bloodType!: string | null;

  @Column({
    name: 'pregnancy_status',
    type: 'enum',
    enum: PregnancyStatus,
    default: PregnancyStatus.NOT_PREGNANT,
  })
  pregnancyStatus!: PregnancyStatus;

  @Column({ name: 'disability_info', type: 'text', nullable: true })
  disabilityInfo!: string | null;

  @Column({ name: 'current_symptoms', type: 'text', nullable: true })
  currentSymptoms!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  allergies!: string[] | null;

  @Column({ name: 'chronic_conditions', type: 'jsonb', nullable: true })
  chronicConditions!: string[] | null;

  @Column({ name: 'past_surgeries', type: 'jsonb', nullable: true })
  pastSurgeries!: string[] | null;

  @Column({ name: 'family_history', type: 'jsonb', nullable: true })
  familyHistory!: string[] | null;

  @Column({ name: 'current_medications', type: 'jsonb', nullable: true })
  currentMedications!: string[] | null;

  @Column({ name: 'lifestyle_habits', type: 'jsonb', nullable: true })
  lifestyleHabits!: string[] | null;

  @Column({ name: 'vaccination_status', type: 'jsonb', nullable: true })
  vaccinationStatus!: string[] | null;

  @OneToOne(() => PatientProfile, (patientProfile) => patientProfile.medicalProfile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patient_profile_id' })
  patientProfile!: PatientProfile;

  @OneToMany(() => MedicalProfileLog, (log) => log.medicalProfile)
  logs!: MedicalProfileLog[];
}
