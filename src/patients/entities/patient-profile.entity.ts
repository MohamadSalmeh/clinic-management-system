import { BaseEntity } from '../../common/entities/base.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { MaritalStatus } from '../../users/enums/marital-status.enum';
import { User } from '../../users/entities/user.entity';
import { MedicalProfile } from '../../medical-profiles/entities/medical-profile.entity';
import { Rating } from '../../ratings/entities/rating.entity';
import { Column, Entity, Index, JoinColumn, OneToMany, OneToOne } from 'typeorm';

@Entity({ name: 'patient_profiles' })
export class PatientProfile extends BaseEntity {
  @Index()
  @Column({ type: 'bigint', unique: true })
  userId!: number;

  @Column({ name: 'marital_status', type: 'enum', enum: MaritalStatus })
  maritalStatus!: MaritalStatus;

  @Column({ type: 'varchar', length: 100 })
  occupation!: string;

  @Column({ name: 'emergency_contact_name', type: 'varchar', length: 255 })
  emergencyContactName!: string;

  @Column({ name: 'emergency_contact_phone', type: 'varchar', length: 20 })
  emergencyContactPhone!: string;

  @OneToOne(() => User, (user) => user.patientProfile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @OneToOne(() => MedicalProfile, (medicalProfile) => medicalProfile.patientProfile)
  medicalProfile!: MedicalProfile;

  @OneToMany(() => Rating, (rating) => rating.patientProfile)
  ratings!: Rating[];

  @OneToMany(() => Appointment, (appointment) => appointment.patient)
  appointments!: Appointment[];
}
