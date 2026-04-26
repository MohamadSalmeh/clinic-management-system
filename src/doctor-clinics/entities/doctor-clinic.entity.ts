import { BaseEntity } from '../../common/entities/base.entity';
import { DoctorProfile } from '../../doctors/entities/doctor-profile.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    Unique,
} from 'typeorm';
import { Clinic } from '../../clinics/entities/clinic.entity';

@Entity({ name: 'doctor_clinic' })
@Unique('unique_doctor_clinic', ['clinicId', 'doctorId'])
export class DoctorClinic extends BaseEntity {
    @Index()
    @Column({ name: 'clinic_id', type: 'bigint' })
    clinicId!: number;

    @Index()
    @Column({ name: 'doctor_id', type: 'bigint' })
    doctorId!: number;

    @ManyToOne(() => Clinic, (clinic) => clinic.doctorAssignments, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'clinic_id' })
    clinic!: Clinic;

    @ManyToOne(() => DoctorProfile, (doctor) => doctor.clinicAssignments, {
        onDelete: 'CASCADE',
        eager: true,
    })
    @JoinColumn({ name: 'doctor_id' })
    doctor!: DoctorProfile;
}
