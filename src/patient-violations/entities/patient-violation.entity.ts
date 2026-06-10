import { BaseEntity } from '../../common/entities/base.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { User } from '../../users/entities/user.entity';

import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    Index,
} from 'typeorm';

import { ViolationType } from '../enums/violation-type.enum';
import { ViolationCreatedBy } from '../enums/violation-created-by.enum';

@Entity({
    name: 'patient_violations',
})
export class PatientViolation extends BaseEntity {

    @Index()
    @Column({
        name: 'user_id',
        type: 'bigint',
    })
    userId!: number;

    @Index()
    @Column({
        name: 'appointment_id',
        type: 'bigint',
        nullable: true,
    })
    appointmentId!: number | null;

    @Column({
        type: 'enum',
        enum: ViolationType,
    })
    type!: ViolationType;

    @Column({
        name: 'created_by',
        type: 'enum',
        enum: ViolationCreatedBy,
    })
    createdBy!: ViolationCreatedBy;

    @Column({
        type: 'text',
        nullable: true,
    })
    notes!: string | null;

    @ManyToOne(() => User)
    @JoinColumn({
        name: 'user_id',
    })
    user!: User;

    @ManyToOne(() => Appointment)
    @JoinColumn({
        name: 'appointment_id',
    })
    appointment!: Appointment | null;

}