import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MedicalHistory } from '../../medical-histories/entities/medical-history.entity';
import { MedicalProfile } from '../../medical-profiles/entities/medical-profile.entity';
import { User } from '../../users/entities/user.entity';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity({ name: 'medical_attachments' })
@Check(`
(
    ("medical_history_id" IS NOT NULL AND "medical_profile_id" IS NULL)
    OR
    ("medical_history_id" IS NULL AND "medical_profile_id" IS NOT NULL)
)
`)
export class MedicalAttachment extends BaseEntity {
  @Index()
  @Column({ name: 'medical_history_id', type: 'bigint', nullable: true })
  medicalHistoryId!: number | null;

  @Index()
  @Column({ name: 'medical_profile_id', type: 'bigint', nullable: true })
  medicalProfileId!: number | null;

  @Index()
  @Column({ name: 'user_id', type: 'bigint' })
  userId!: number;

  @Column({ name: 'file_path', type: 'text' })
  filePath!: string;

  @Column({ name: 'file_type', type: 'varchar', length: 100 })
  fileType!: string;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName!: string;

  @ManyToOne(
    () => MedicalHistory,
    (medicalHistory) => medicalHistory.attachments,
    {
      onDelete: 'CASCADE',
      nullable: true,
    },
  )
  @JoinColumn({ name: 'medical_history_id' })
  medicalHistory!: MedicalHistory | null;

  @ManyToOne(() => MedicalProfile, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'medical_profile_id' })
  medicalProfile!: MedicalProfile | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
