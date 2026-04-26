import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToOne,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ColumnNumericTransformer } from '../../common/transformers/column-numeric.transformer';
import { PatientProfile } from '../../patients/entities/patient-profile.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { DoctorProfile } from '../../doctors/entities/doctor-profile.entity';

export enum ReferralStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    EXPIRED = 'EXPIRED',
}

@Entity({ name: 'referrals' })
export class Referral extends BaseEntity {
    @Index()
    @Column({
        name: 'patient_id',
        type: 'bigint',
        transformer: new ColumnNumericTransformer(),
    })
    patientId!: number;

    @Index()
    @Column({
        name: 'from_doctor_id',
        type: 'bigint',
        transformer: new ColumnNumericTransformer(),
    })
    fromDoctorId!: number;

    @Index()
    @Column({
        name: 'to_doctor_id',
        type: 'bigint',
        transformer: new ColumnNumericTransformer(),
    })
    toDoctorId!: number;

    @Column({ type: 'text' })
    reason!: string;

    @Column({
        type: 'enum',
        enum: ReferralStatus,
        default: ReferralStatus.PENDING,
    })
    status!: ReferralStatus;

    @Column({
        name: 'appointment_id',
        type: 'bigint',
        nullable: true,
        transformer: new ColumnNumericTransformer(),
    })
    appointmentId!: number | null;

    @ManyToOne(() => PatientProfile)
    @JoinColumn({ name: 'patient_id' })
    patient!: PatientProfile;

    @ManyToOne(() => DoctorProfile)
    @JoinColumn({ name: 'from_doctor_id' })
    fromDoctor!: DoctorProfile;

    @ManyToOne(() => DoctorProfile)
    @JoinColumn({ name: 'to_doctor_id' })
    toDoctor!: DoctorProfile;


    @OneToOne(() => Appointment, (appointment) => appointment.referral, { nullable: true })
    @JoinColumn({ name: 'appointment_id' })
    appointment!: Appointment | null;
}
