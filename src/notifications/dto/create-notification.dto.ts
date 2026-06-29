import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { NotificationPriority } from '../enums/notification-priority.enum';
import { NotificationTargetType } from '../enums/notification-target-type.enum';
import { NotificationType } from '../enums/notification-type.enum';

export class CreateNotificationDto {
  @Type(() => Number)
  @IsInt()
  userId!: number;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsString()
  messageKey?: string;

  @IsOptional()
  @IsObject()
  arguments?: Record<string, unknown>;

  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsEnum(NotificationPriority)
  priority!: NotificationPriority;

  @IsOptional()
  @IsEnum(NotificationTargetType)
  targetType?: NotificationTargetType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  targetId?: number;

  @IsOptional()
  @IsString()
  actionUrl?: string;
}
