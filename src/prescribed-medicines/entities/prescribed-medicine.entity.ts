import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { PatientProfile } from '../../patients/entities/patient-profile.entity';
import { MedicineStatus } from '../enums/medicine-status.enum';
import { DoctorProfile } from '../../doctors/entities/doctor-profile.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { ColumnNumericTransformer } from '../../common/transformers/column-numeric.transformer';
import { MedicalHistory } from '../../medical-histories/entities/medical-history.entity';

@Entity({ name: 'prescribed_medicines' })
export class PrescribedMedicine extends BaseEntity {
  @Index()
  @Column({ name: 'patient_profile_id', type: 'bigint' })
  patientProfileId!: number;

  @Index()
  @Column({ 
    name: 'medical_history_id', 
    type: 'bigint',
    transformer: new ColumnNumericTransformer() 
  })
  medicalHistoryId!: number;

  @Column({ name: 'medicine_name', type: 'varchar' })
  medicineName!: string;

  @Column({ type: 'varchar', nullable: true })
  dosage!: string | null;

  @Column({ type: 'varchar', nullable: true })
  frequency!: string | null;

  @Column({
    type: 'enum',
    enum: MedicineStatus,
    default: MedicineStatus.ACTIVE,
  })
  status!: MedicineStatus;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate!: Date | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @ManyToOne(() => PatientProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_profile_id' })
  patientProfile!: PatientProfile;

  @ManyToOne(() => MedicalHistory, (history) => history.medicines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'medical_history_id' })
  medicalHistory!: MedicalHistory;

}
