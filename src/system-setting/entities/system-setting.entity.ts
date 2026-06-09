import { BaseEntity } from '../../common/entities/base.entity';
import { Column, Entity } from 'typeorm';

@Entity({ name: 'system_settings' })
export class SystemSetting extends BaseEntity {

    @Column({
        name: 'cancel_before_days',
        type: 'int',
        default: 2,
    })
    cancelBeforeDays!: number;

    @Column({
        name: 'late_cancel_penalty_percent',
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 30,
    })
    lateCancelPenaltyPercent!: string;

    @Column({
        name: 'max_no_show_count',
        type: 'int',
        default: 3,
    })
    maxNoShowCount!: number;

    @Column({
        name: 'initial_visit_duration',
        type: 'int',
        default: 30,
    })
    initialVisitDuration!: number;

    @Column({
        name: 'return_visit_duration',
        type: 'int',
        default: 20,
    })
    returnVisitDuration!: number;
}