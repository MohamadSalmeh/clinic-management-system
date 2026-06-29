import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NotificationPriority } from '../enums/notification-priority.enum';
import { NotificationStatus } from '../enums/notification-status.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationTargetType } from '../enums/notification-target-type.enum';
import { BaseEntity } from '../../common/entities/base.entity';
import { ColumnNumericTransformer } from '../../common/transformers/column-numeric.transformer';

@Entity({ name: 'notifications' })
export class Notification extends BaseEntity {
  

  @Index()
  @Column({
    name: 'user_id',
    type: 'bigint',
    transformer: new ColumnNumericTransformer(),
  })
  userId!: number;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ name: 'message_key', type: 'varchar', length: 255, nullable: true })
  messageKey!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  arguments!: Record<string, unknown> | null;

  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status!: NotificationStatus;

  @Column({
    name: 'target_type',
    type: 'enum',
    enum: NotificationTargetType,
    nullable: true,
  })
  targetType!: NotificationTargetType | null;

  @Index()
  @Column({
    name: 'target_id',
    type: 'bigint',
    nullable: true,
    transformer: new ColumnNumericTransformer(),
  })
  targetId!: number | null;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt!: Date | null;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt!: Date | null;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  priority!: NotificationPriority;

  @Column({ name: 'action_url', type: 'text', nullable: true })
  actionUrl!: string | null;

  @ManyToOne(() => User, (user) => user.notifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
