import { IsEnum } from 'class-validator';
import { NotificationStatus } from '../enums/notification-status.enum';

export class UpdateNotificationStatusDto {
  @IsEnum(NotificationStatus)
  status!: NotificationStatus;
}
