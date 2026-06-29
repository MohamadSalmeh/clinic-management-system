import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto';
import { NotificationStatus } from './enums/notification-status.enum';
import { NotificationType } from './enums/notification-type.enum';
import { NotificationPriority } from './enums/notification-priority.enum';
import { NotificationTargetType } from './enums/notification-target-type.enum';
import { NotificationI18nService } from './i18n/notification-i18n.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly notificationI18nService: NotificationI18nService,
  ) {}

  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId: dto.userId,
      title: dto.title,
      body: dto.body,
      messageKey: dto.messageKey ?? null,
      arguments: dto.arguments ?? null,
      type: dto.type,
      priority: dto.priority,
      targetType: dto.targetType ?? null,
      targetId: dto.targetId ?? null,
      actionUrl: dto.actionUrl ?? null,
      status: NotificationStatus.PENDING,
    });

    return this.notificationRepository.save(notification);
  }

  async notifyPatientAboutLeaveCancellation(
    patientUserId: number,
    appointmentId: number,
    exceptionDate: string,
  ): Promise<Notification> {
    return this.createNotification({
      userId: patientUserId,
      title: '',
      body: '',
      messageKey: 'appointment.cancelled',
      arguments: {
        appointmentId,
        exceptionDate,
      },
      type: NotificationType.APPOINTMENT,
      priority: NotificationPriority.HIGH,
      targetType: NotificationTargetType.APPOINTMENT,
      targetId: appointmentId,
    });
  }

  async getNotificationsForUser(
    userId: number,
    lang = 'en',
  ): Promise<Array<Notification & { title: string; body: string }>> {
    const notifications = await this.notificationRepository.find({
      where: { userId },
      order: { created_at: 'DESC' },
    });

    return notifications.map((notification) => {
      const translated = this.notificationI18nService.translateNotification(
        notification,
        lang,
      );

      return {
        ...notification,
        title: translated.title,
        body: translated.body,
      };
    });
  }

  async markAsRead(notificationId: number, userId: number): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.readAt = new Date();

    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: number): Promise<{ updatedCount: number }> {
    const result = await this.notificationRepository.update(
      { userId, readAt: IsNull() },
      { readAt: new Date() },
    );

    return { updatedCount: result.affected ?? 0 };
  }
}
