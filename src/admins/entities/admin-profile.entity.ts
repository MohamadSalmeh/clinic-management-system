import { Column, Entity, Index, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { DoctorInvitation } from '../../doctor-invitations/entities/doctor-invitation.entity';
import { DoctorProfile } from '../../doctors/entities/doctor-profile.entity';

@Entity({ name: 'admin_profiles' })
export class AdminProfile extends BaseEntity {
    @Index()
    @Column({ name: 'user_id', type: 'bigint', unique: true })
    userId!: number;

    @OneToOne(() => User, (user) => user.adminProfile, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @OneToMany(() => DoctorInvitation, (invitation) => invitation.invitedByAdmin)
    invitations!: DoctorInvitation[];

    @OneToMany(() => DoctorProfile, (doctor) => doctor.invitedByAdmin)
    invitedDoctors!: DoctorProfile[];
}
