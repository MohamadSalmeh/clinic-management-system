import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { AdminProfile } from '../../admins/entities/admin-profile.entity';
import { User } from '../../users/entities/user.entity';
import { DoctorInvitationStatus } from '../enums/doctor-invitation-status.enum';

@Entity({ name: 'doctor_invitations' })
export class DoctorInvitation extends BaseEntity {
    @Index()
    @Column({ type: 'varchar', length: 255 })
    email!: string;

    @Index()
    @Column({ type: 'varchar', length: 128, unique: true })
    token!: string;

    @Column({
        type: 'enum',
        enum: DoctorInvitationStatus,
        default: DoctorInvitationStatus.PENDING,
    })
    status!: DoctorInvitationStatus;

    @Column({ name: 'expires_at', type: 'timestamp' })
    expiresAt!: Date;

    @Index()
    @Column({ name: 'invited_by_admin_id', type: 'bigint', nullable: true })
    invitedByAdminId!: number | null;

    @Index()
    @Column({ name: 'doctor_user_id', type: 'bigint', nullable: true })
    doctorUserId!: number | null;

    @ManyToOne(() => AdminProfile, (admin) => admin.invitations, {
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'invited_by_admin_id' })
    invitedByAdmin?: AdminProfile | null;

    @ManyToOne(() => User, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'doctor_user_id' })
    doctorUser?: User | null;
}
