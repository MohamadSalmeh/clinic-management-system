import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { DoctorProfile } from './doctor-profile.entity';
import { ColumnNumericTransformer } from '../../common/transformers/column-numeric.transformer';

export enum DoctorAdminLogType {
  FEE_UPDATE = 'FEE_UPDATE',
  SCHEDULE_APPROVE = 'SCHEDULE_APPROVE',
}

@Entity({ name: 'doctor_admin_logs' })
export class DoctorAdminLog extends BaseEntity {
  @Index()
  @Column({
    name: 'doctor_profile_id',
    type: 'bigint',
    transformer: new ColumnNumericTransformer(),
  })
  doctorProfileId!: number;

  @Column({ type: 'enum', enum: DoctorAdminLogType })
  type!: DoctorAdminLogType;

  @Column({ name: 'field_name', type: 'varchar', length: 255, nullable: true })
  fieldName!: string | null;

  @Column({ name: 'old_value', type: 'text', nullable: true })
  oldValue!: string | null;

  @Column({ name: 'new_value', type: 'text', nullable: true })
  newValue!: string | null;

  @Column({
    name: 'changed_by_id',
    type: 'bigint',
    transformer: new ColumnNumericTransformer(),
  })
  changedById!: number;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @ManyToOne(() => DoctorProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_profile_id' })
  doctorProfile!: DoctorProfile;
}
