import { Expose } from 'class-transformer';
import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
} from 'typeorm';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { BaseEntity } from '../../common/entities/base.entity';
import { MedicalAttachment } from '../../medical-attachments/entities/medical-attachment.entity';
import { MedicalProfile } from '../../medical-profiles/entities/medical-profile.entity';
import { PrescribedMedicine } from '../../prescribed-medicines/entities/prescribed-medicine.entity';
import { DoctorProfile } from '../../doctors/entities/doctor-profile.entity';

@Entity({ name: 'medical_histories' })
export class MedicalHistory extends BaseEntity {
    @Index()
    @Column({ name: 'medical_profile_id', type: 'bigint' })
    medicalProfileId!: number;

    @Index()
    @Column({ name: 'appointment_id', type: 'bigint', unique: true })
    appointmentId!: number;

    @Index()
    @Column({ name: 'doctor_profile_id', type: 'bigint' })
    doctorProfileId!: number;

    @Column({ type: 'text' })
    diagnosis!: string;

    @Column({ name: 'treatment_plan', type: 'text' })
    treatmentPlan!: string;

    @Column({ name: 'doctor_notes', type: 'text' })
    doctorNotes!: string;

    @Column({ name: 'follow_up_needed', type: 'boolean', default: false })
    followUpNeeded!: boolean;

    @Column({ name: 'follow_up_date', type: 'date', nullable: true })
    followUpDate!: Date | null;

    @OneToMany(() => PrescribedMedicine, (medicine) => medicine.medicalHistory)
    medicines!: PrescribedMedicine[];

    @Expose({ name: 'attachments_count' })
    get attachmentsCount(): number {
        return this.attachments?.length ?? 0;
    }

    @Expose({ name: 'history_label' })
    get historyLabel(): string {
        return this.followUpNeeded ? 'Follow-up Required' : 'Standard Visit';
    }

    @ManyToOne(() => MedicalProfile, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'medical_profile_id' })
    medicalProfile!: MedicalProfile;

    @OneToOne(() => Appointment, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'appointment_id' })
    appointment!: Appointment;

    @ManyToOne(() => DoctorProfile, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'doctor_profile_id' })
    doctorProfile!: DoctorProfile;

    @OneToMany(() => MedicalAttachment, (attachment) => attachment.medicalHistory)
    attachments!: MedicalAttachment[];
}
