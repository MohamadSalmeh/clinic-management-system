import { Expose } from 'class-transformer';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { BaseEntity } from '../../common/entities/base.entity';
import { DoctorClinic } from '../../doctor-clinics/entities/doctor-clinic.entity';
import { DoctorProfileStatus } from '../../users/enums/doctor-profile-status.enum';
import { User } from '../../users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { DoctorSchedule } from '../../doctor-schedules/entities/doctor-schedule.entity';
import { Queue } from '../../queues/entities/queue.entity';
import { Rating } from '../../ratings/entities/rating.entity';

@Entity({ name: 'doctor_profiles' })
export class DoctorProfile extends BaseEntity {
    @Index()
    @Column({ type: 'bigint', unique: true })
    userId!: number;

    @Column({ type: 'varchar', length: 100 })
    specialization!: string;

    @Column({ name: 'sub_specialization', type: 'varchar', length: 100 })
    subSpecialization!: string;

    @Column({ name: 'license_number', type: 'varchar', length: 100 })
    licenseNumber!: string;

    @Column({ name: 'experience_years', type: 'int' })
    experienceYears!: number;

    @Column({ type: 'text' })
    bio!: string;


    @Column({
        name: 'initial_visit_fee', type: 'decimal', precision: 10, scale: 2, default: 0
    })
    initialVisitFee!: string;

    @Column({
        name: 'return_visit_fee', type: 'decimal', precision: 10, scale: 2, default: 0
    })
    returnVisitFee!: string;
    @Column({ name: 'languages_spoken', type: 'json', nullable: true, default: () => "'[]'" })
    languagesSpoken!: string[];

    @Column({ type: 'enum', enum: DoctorProfileStatus, default: DoctorProfileStatus.ACTIVE })
    status!: DoctorProfileStatus;

    /*@Expose({ name: 'average_rating' })
    averageRating?: string;
  
    @Expose({ name: 'reviews_count' })
    reviewsCount?: number;*/

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
}
