import { BaseEntity } from '../../common/entities/base.entity';
import { Clinic } from '../../clinics/entities/clinic.entity';
import { DoctorProfile } from '../../doctors/entities/doctor-profile.entity';
import { PatientProfile } from '../../patients/entities/patient-profile.entity';

import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    Unique,
} from 'typeorm';
import { ColumnNumericTransformer } from '../../common/transformers/column-numeric.transformer';
import { Transform } from 'class-transformer';
import { toDateString } from '../../common/utils/date-utils';
export enum WaitlistStatus {
    WAITING = 'WAITING',
}
@Unique(
    'UQ_waitlist_patient_doctor_clinic_date',
    [
        'patientProfileId',
        'doctorProfileId',
        'clinicId',
        'requestedDate',
    ],
)
@Entity({ name: 'waitlists' })
export class Waitlist extends BaseEntity {
    @Index()
    @Column({
        name: 'patient_profile_id',
        type: 'bigint',
        transformer: new ColumnNumericTransformer(),
    })
    patientProfileId!: number;
    @Index()
    @Column({
        name: 'doctor_profile_id',
        type: 'bigint',
        transformer: new ColumnNumericTransformer(),
    })
    doctorProfileId!: number;

    @Index()
    @Column({
        name: 'clinic_id',
        type: 'bigint',
        transformer: new ColumnNumericTransformer(),
    })
    clinicId!: number;
@Transform(({ value }) => toDateString(value), { toPlainOnly: true })
    @Column({
        name: 'requested_date',
        type: 'date',
    })
    requestedDate!: Date;

    /*@Column({
        type: 'enum',
        enum: WaitlistStatus,
        default: WaitlistStatus.WAITING,
    })
    status!: WaitlistStatus;

    @Column({
        name: 'notification_sent_at',
        type: 'timestamp',
        nullable: true,
    })
    notificationSentAt!: Date | null;*/

    @ManyToOne(() => PatientProfile, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'patient_profile_id' })
    patient!: PatientProfile;

    @ManyToOne(() => DoctorProfile, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'doctor_profile_id' })
    doctor!: DoctorProfile;

    @ManyToOne(() => Clinic, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'clinic_id' })
    clinic!: Clinic;
}