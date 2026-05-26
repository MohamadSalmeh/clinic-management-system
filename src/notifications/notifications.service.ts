import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto';
import { NotificationStatus } from './enums/notification-status.enum';
import { NotificationType } from './enums/notification-type.enum';
import { NotificationPriority } from './enums/notification-priority.enum';
import { NotificationTargetType } from './enums/notification-target-type.enum';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId: dto.userId,
      title: dto.title,
      body: dto.body,
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
    const notification = this.notificationRepository.create({
      userId: patientUserId,
      title: 'تنبيه طبي مهم: إلغاء موعد',
      body: `عذراً عزيزي المريض، نود إعلامك بأن موعدك المحجوز بتاريخ ${exceptionDate} قد تم إلغاؤه تلقائياً بسبب إجازة طارئة وخارجة عن الإرادة للطبيب. يمكنك الدخول لإعادة الجدولة وحجز موعد آخر.`,
      type: NotificationType.APPOINTMENT,
      priority: NotificationPriority.HIGH,
      targetType: NotificationTargetType.APPOINTMENT,
      targetId: appointmentId,
      status: NotificationStatus.PENDING,
    });

    return this.notificationRepository.save(notification);
  }

  async getNotificationsForUser(userId: number): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userId },
      order: { created_at: 'DESC' },
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
