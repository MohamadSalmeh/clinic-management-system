import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MedicalHistory } from '../../medical-histories/entities/medical-history.entity';
import { BaseEntity } from '../../common/entities/base.entity'; 

@Entity({ name: 'medical_attachments' })
export class MedicalAttachment extends BaseEntity {

  @Index()
  @Column({ name: 'medical_history_id', type: 'bigint' })
  medicalHistoryId!: number;

  @Column({ name: 'file_path', type: 'text' })
  filePath!: string;

  @Column({ name: 'file_type', type: 'varchar', length: 100 })
  fileType!: string;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName!: string;

  @ManyToOne(() => MedicalHistory, (medicalHistory) => medicalHistory.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'medical_history_id' })
  medicalHistory!: MedicalHistory;
}
