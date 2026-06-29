import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { MedicineStatus } from '../enums/medicine-status.enum';
import { ColumnNumericTransformer } from '../../common/transformers/column-numeric.transformer';
import { MedicalHistory } from '../../medical-histories/entities/medical-history.entity';
import { MedicalProfile } from '../../medical-profiles/entities/medical-profile.entity';
import { User } from '../../users/entities/user.entity';


@Check(`
(
    ("medical_history_id" IS NOT NULL AND "medical_profile_id" IS NULL)
    OR
    ("medical_history_id" IS NULL AND "medical_profile_id" IS NOT NULL)
)
`)
@Entity({ name: 'prescribed_medicines' })
export class PrescribedMedicine extends BaseEntity {

  @Index()
  @Column({
    name: 'medical_profile_id',
    type: 'bigint',
    nullable: true,
  })
  medicalProfileId!: number | null;

  @Column({
    name: 'medical_history_id',
    type: 'bigint',
    nullable: true,
    transformer: new ColumnNumericTransformer(),
  })
  medicalHistoryId!: number | null;

  @Index()
  @Column({ name: 'user_id', type: 'bigint' })
  userId!: number;

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

  @ManyToOne(() => MedicalProfile, (medicalProfile) => medicalProfile.prescribedMedicines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'medical_profile_id' })
  medicalProfile!: MedicalProfile;

  @ManyToOne(
    () => MedicalHistory,
    (history) => history.medicines,
    {
      onDelete: 'CASCADE',
      nullable: true,
    },
  )
  @JoinColumn({ name: 'medical_history_id' })
  medicalHistory!: MedicalHistory | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

}
