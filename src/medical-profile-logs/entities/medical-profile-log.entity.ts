import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MedicalProfile } from '../../medical-profiles/entities/medical-profile.entity';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';

@Entity({ name: 'medical_profile_logs' })
export class MedicalProfileLog extends BaseEntity {

  @Index()
  @Column({ name: 'medical_profile_id', type: 'bigint' })
  medicalProfileId!: number;

  @Index()
  @Column({ name: 'user_id', type: 'bigint' })
  userId!: number;

  @Column({ name: 'change_reason', type: 'text', nullable: true })
  changeReason!: string | null;

  @Column({ name: 'field_name', type: 'varchar', length: 50 })
  fieldName!: string;

  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue!: any;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue!: any;

  @ManyToOne(() => User, (user) => user.medicalProfileLogs)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => MedicalProfile, (medicalProfile) => medicalProfile.logs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'medical_profile_id' })
  medicalProfile!: MedicalProfile;

  @Index()
  @Column({ name: 'appointment_id', type: 'bigint', nullable: true })
  appointmentId!: number | null;

  @ManyToOne(() => Appointment, (appointment) => appointment.medicalProfileLogs, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'appointment_id' })
  appointment?: Appointment | null;
}
