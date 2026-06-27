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

      @Column({
        name: 'consultation_duration',
        type: 'int',
        default: 20,
    })
    consultationDuration!: number;

    @Column({
        name: 'follow_up_duration',
        type: 'int',
        default: 10,
    })
    followUpDuration!: number;

    @Column({
        name: 'operation_duration',
        type: 'int',
        default: 45,
    })
    operationDuration!: number;

    @Column({
        name: 'default_duration',
        type: 'int',
        default: 15,
    })
    defaultDuration!: number;

    @Column({
    name: 'checkin_before_hours',
    type: 'int',
    default: 1,
  })
  checkinBeforeHours!: number;

  @Column({
        name: 'referral_follow_up_expiration_days',
        type: 'int',
        default: 14,
    })
    referralFollowUpExpirationDays!: number;

    @Column({
        name: 'referral_external_expiration_days',
        type: 'int',
        default: 30,
    })
    referralExternalExpirationDays!: number;
    
}