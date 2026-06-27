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
import { Clinic } from '../../clinics/entities/clinic.entity'; // استيراد كيان العيادات

export enum ReferralStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    EXPIRED = 'EXPIRED',
}

export enum ReferralType {
    EXTERNAL = 'EXTERNAL',     // تحويل لطبيب أو قسم آخر
    FOLLOW_UP = 'FOLLOW_UP',   // مراجعة لنفس الطبيب
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

    // جعلناه nullable لدعم التحويل إلى عيادة/قسم عام دون تخصيص طبيب
    @Index()
    @Column({
        name: 'to_doctor_id',
        type: 'bigint',
        nullable: true, 
        transformer: new ColumnNumericTransformer(),
    })
    toDoctorId!: number | null;

    // الحقل الجديد لدعم التحويل إلى قسم/عيادة محددة
    @Index()
    @Column({
        name: 'to_clinic_id',
        type: 'bigint',
        nullable: true,
        transformer: new ColumnNumericTransformer(),
    })
    toClinicId!: number | null;

    @Column({
        type: 'enum',
        enum: ReferralType,
        default: ReferralType.EXTERNAL,
    })
    type!: ReferralType;

    @Column({ type: 'text' })
    reason!: string;

    @Column({
        type: 'enum',
        enum: ReferralStatus,
        default: ReferralStatus.PENDING,
    })
    status!: ReferralStatus;

    // إضافة تاريخ انتهاء صلاحية التحويل (مثلاً التحويل صالح لمدة شهر فقط)
    @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
    expiresAt!: Date | null;

    
    @Column({
        name: 'appointment_id',
        type: 'bigint',
        nullable: true,
        transformer: new ColumnNumericTransformer(),
    })
    appointmentId!: number | null;

    // العلاقات (Relationships)
    @ManyToOne(() => PatientProfile)
    @JoinColumn({ name: 'patient_id' })
    patient!: PatientProfile;

    @ManyToOne(() => DoctorProfile)
    @JoinColumn({ name: 'from_doctor_id' })
    fromDoctor!: DoctorProfile;

    @ManyToOne(() => DoctorProfile, { nullable: true })
    @JoinColumn({ name: 'to_doctor_id' })
    toDoctor!: DoctorProfile | null;

    @ManyToOne(() => Clinic, { nullable: true })
    @JoinColumn({ name: 'to_clinic_id' })
    toClinic!: Clinic | null;

    @OneToOne(() => Appointment, (appointment) => appointment.referral, { nullable: true })
    @JoinColumn({ name: 'appointment_id' })
    appointment!: Appointment | null;
}