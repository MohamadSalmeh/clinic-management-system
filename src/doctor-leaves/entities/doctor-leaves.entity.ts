import { BaseEntity } from '../../common/entities/base.entity';
import { DoctorProfile } from '../../doctors/entities/doctor-profile.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

@Entity({ name: 'doctor_leaves' })
export class DoctorLeave extends BaseEntity {
    @Index()
    @Column({ name: 'doctor_profile_id', type: 'bigint' })
    doctorProfileId!: number;

    @Column({ name: 'exception_date', type: 'date' })
    exceptionDate!: Date;
    
    /**
       * These fields are populated programmatically based on the selected DoctorSchedule.
       * * Logic:
       * - If NULL: Represents a full-day leave (all slots are cancelled).
       * - If set: Represents a specific time slot exception (e.g., '09:00:00' to '12:00:00').
       */
    @Column({ name: 'start_time', type: 'time', nullable: true })
    startTime!: string | null;

    @Column({ name: 'end_time', type: 'time', nullable: true })
    endTime!: string | null;

    @Column({ type: 'text', nullable: true })
    reason!: string | null;

    @ManyToOne(() => DoctorProfile, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'doctor_profile_id' })
    doctorProfile!: DoctorProfile;
}
