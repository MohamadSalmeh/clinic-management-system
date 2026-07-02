import { Expose } from 'class-transformer';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { BaseEntity } from '../../common/entities/base.entity';
import { DoctorClinic } from '../../doctor-clinics/entities/doctor-clinic.entity';
import { DoctorProfileStatus } from '../../users/enums/doctor-profile-status.enum';
import { User } from '../../users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { DoctorSchedule } from '../../doctor-schedules/entities/doctor-schedule.entity';
import { Queue } from '../../queues/entities/queue.entity';
import { Rating } from '../../ratings/entities/rating.entity';
import { FavoriteDoctor } from '../../favorite-doctors/entities/favorite-doctor.entity';

@Entity({ name: 'doctor_profiles' })
export class DoctorProfile extends BaseEntity {
    @Index()
    @Column({ type: 'bigint', unique: true })
    userId!: number;

    @Column({ type: 'varchar', length: 100, nullable: true })
    specialization!: string | null;

    @Column({ name: 'sub_specialization', type: 'varchar', length: 100, nullable: true })
    subSpecialization!: string | null;

    @Column({ name: 'license_number', type: 'varchar', length: 100, nullable: true })
    licenseNumber!: string | null;

    @Column({ name: 'experience_years', type: 'int', nullable: true })
    experienceYears!: number | null;

    @Column({ type: 'text', nullable: true })
    bio!: string | null;


    @Column({
        name: 'initial_visit_fee', type: 'decimal', precision: 10, scale: 2, nullable: true
    })
    initialVisitFee!: string | null;

    @Column({
        name: 'return_visit_fee', type: 'decimal', precision: 10, scale: 2, nullable: true
    })
    returnVisitFee!: string | null;
    @Column({ name: 'languages_spoken', type: 'json', nullable: true, default: () => "'[]'" })
    languagesSpoken!: string[];

    @Column({ type: 'enum', enum: DoctorProfileStatus, default: DoctorProfileStatus.ACTIVE })
    status!: DoctorProfileStatus;

    @Column({ name: 'is_approved', type: 'boolean', default: false })
    isApproved!: boolean;

    @Column({ name: 'invited_by_admin_id', type: 'bigint', nullable: true })
    invitedByAdminId!: number | null;

    // أضف هذا العمود داخل كلاس DoctorProfile
    @Column({
        name: 'average_rating',
        type: 'decimal',
        precision: 3,
        scale: 1,
        default: 0.0,
    })
    averageRating!: number;

    @OneToOne(() => User, (user) => user.doctorProfile, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'userId' })
    user!: User;


    @OneToMany(() => DoctorClinic, (assignment) => assignment.doctor)
    clinicAssignments!: DoctorClinic[];

    @OneToMany(() => DoctorSchedule, (schedule) => schedule.doctorProfile)
    schedules!: DoctorSchedule[];

    @OneToMany(() => Appointment, (appointment) => appointment.doctor)
    appointments!: Appointment[];

    @OneToMany(() => Queue, (queue) => queue.doctor)
    queues!: Queue[];

    @OneToMany(() => Rating, (rating) => rating.doctorProfile)
    ratings!: Rating[];

    @Expose({ name: 'clinics_count' })
    get clinicCount(): number {
        return this.clinicAssignments?.length || 0;
    }
    @OneToMany(
        () => FavoriteDoctor,
        (favorite) => favorite.doctor,
    )
    favoriteByPatients!: FavoriteDoctor[];

}
