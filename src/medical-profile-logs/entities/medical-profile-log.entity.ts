import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MedicalProfile } from '../../medical-profiles/entities/medical-profile.entity';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'medical_profile_logs' })
export class MedicalProfileLog extends BaseEntity {

  @Column({ name: 'medical_profile_id', type: 'bigint' })
  medicalProfileId!: number;

  @Column({ name: 'changed_by_id', type: 'bigint' })
  changedById!: number;

  @Column({ name: 'change_reason', type: 'text', nullable: true })
  changeReason!: string | null;

  @Column({ name: 'field_name', type: 'varchar', length: 50 })
  fieldName!: string;

  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue!: any;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue!: any;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'changed_by_id' })
  changedBy!: User;

  @ManyToOne(() => MedicalProfile, (medicalProfile) => medicalProfile.logs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'medical_profile_id' })
  medicalProfile!: MedicalProfile;
}
