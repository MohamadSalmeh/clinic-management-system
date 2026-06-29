import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { NotificationPriority } from '../enums/notification-priority.enum';
import { NotificationStatus } from '../enums/notification-status.enum';
import { NotificationTargetType } from '../enums/notification-target-type.enum';
import { NotificationType } from '../enums/notification-type.enum';
import {
  AppointmentBookedEvent,
  AppointmentCancelledEvent,
  AppointmentCompletedEvent,
  AppointmentNoShowEvent,
  DoctorRatedEvent,
  MedicalAttachmentUploadedEvent,
  MedicalHistoryCreatedEvent,
  MedicinePrescribedEvent,
  PatientSuspendedEvent,
  ReferralCreatedEvent,
  DoctorInvitationCancelledEvent,
  DoctorInvitationCreatedEvent,
  DoctorInvitationRejectedEvent,
  DoctorScheduleRequestRejectedEvent,
  DoctorScheduleRequestApprovedEvent,
  QueueConsultationCompletedEvent,
  QueuePatientCalledEvent,
  QueuePatientSkippedEvent,
  ReferralConsumedEvent,
  ReferralCancelledEvent,
  ReferralExpiringEvent,
  WalletTopUpEvent,
  WalletTransactionEvent,
} from '../events';

@Injectable()
export class NotificationEventListener {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  @OnEvent(AppointmentCancelledEvent.eventName)
  async handleAppointmentCancelled(
    event: AppointmentCancelledEvent,
  ): Promise<void> {
    await this.saveNotification({
      userId: event.payload.userId,
      messageKey: AppointmentCancelledEvent.eventName,
      arguments: event.payload as unknown as Record<string, unknown>,
      type: NotificationType.APPOINTMENT,
      targetType: NotificationTargetType.APPOINTMENT,
      targetId: event.payload.appointmentId,
      priority: NotificationPriority.HIGH,
    });
  }

  @OnEvent(AppointmentBookedEvent.eventName)
  async handleAppointmentBooked(event: AppointmentBookedEvent): Promise<void> {
    await this.saveNotification({
      userId: event.payload.userId,
      messageKey: AppointmentBookedEvent.eventName,
      arguments: event.payload as unknown as Record<string, unknown>,
      type: NotificationType.APPOINTMENT,
      targetType: NotificationTargetType.APPOINTMENT,
      targetId: event.payload.appointmentId,
      priority: NotificationPriority.MEDIUM,
    });
  }

  @OnEvent(WalletTopUpEvent.eventName)
  async handleWalletTopUp(event: WalletTopUpEvent): Promise<void> {
    await this.saveNotification({
      userId: event.payload.userId,
      messageKey: WalletTopUpEvent.eventName,
      arguments: this.toArguments(event.payload),
      type: NotificationType.SYSTEM,
      targetType: null,
      targetId: null,
      priority: NotificationPriority.MEDIUM,
    });
  }

  @OnEvent(MedicalHistoryCreatedEvent.eventName)
  async handleMedicalHistoryCreated(
    event: MedicalHistoryCreatedEvent,
  ): Promise<void> {
    await this.saveNotification({
      userId: event.payload.userId,
      messageKey: MedicalHistoryCreatedEvent.eventName,
      arguments: this.toArguments(event.payload),
      type: NotificationType.SYSTEM,
      targetType: null,
      targetId: null,
      priority: NotificationPriority.MEDIUM,
    });
  }

  @OnEvent(MedicinePrescribedEvent.eventName)
  async handleMedicinePrescribed(event: MedicinePrescribedEvent): Promise<void> {
    await this.saveNotification({
      userId: event.payload.userId,
      messageKey: MedicinePrescribedEvent.eventName,
      arguments: this.toArguments(event.payload),
      type: NotificationType.SYSTEM,
      targetType: null,
      targetId: null,
      priority: NotificationPriority.MEDIUM,
    });
  }

  @OnEvent(MedicalAttachmentUploadedEvent.eventName)
  async handleMedicalAttachmentUploaded(
    event: MedicalAttachmentUploadedEvent,
  ): Promise<void> {
    await this.saveNotification({
      userId: event.payload.userId,
      messageKey: MedicalAttachmentUploadedEvent.eventName,
      arguments: this.toArguments(event.payload),
      type: NotificationType.SYSTEM,
      targetType: null,
      targetId: null,
      priority: NotificationPriority.MEDIUM,
    });
  }

  @OnEvent(DoctorRatedEvent.eventName)
  async handleDoctorRated(event: DoctorRatedEvent): Promise<void> {
    await this.saveNotification({
      userId: event.payload.userId,
      messageKey: DoctorRatedEvent.eventName,
      arguments: this.toArguments(event.payload),
      type: NotificationType.SYSTEM,
      targetType: null,
      targetId: null,
      priority: NotificationPriority.MEDIUM,
    });
  }

  @OnEvent(AppointmentCompletedEvent.eventName)
  async handleAppointmentCompleted(
    event: AppointmentCompletedEvent,
  ): Promise<void> {
    await this.saveNotification({
      userId: event.payload.userId,
      messageKey: AppointmentCompletedEvent.eventName,
      arguments: this.toArguments(event.payload),
      type: NotificationType.APPOINTMENT,
      targetType: NotificationTargetType.APPOINTMENT,
      targetId: event.payload.appointmentId,
      priority: NotificationPriority.MEDIUM,
    });
  }

  @OnEvent(PatientSuspendedEvent.eventName)
  async handlePatientSuspended(event: PatientSuspendedEvent): Promise<void> {
    await this.saveNotification({
      userId: event.payload.userId,
      messageKey: PatientSuspendedEvent.eventName,
      arguments: this.toArguments(event.payload),
      type: NotificationType.SYSTEM,
      targetType: null,
      targetId: null,
      priority: NotificationPriority.HIGH,
    });
  }

  @OnEvent(WalletTransactionEvent.eventName)
  async handleWalletTransaction(event: WalletTransactionEvent): Promise<void> {
    const messageKey =
      event.payload.action === 'FREEZE'
        ? 'notifications.wallet.frozen'
        : 'notifications.wallet.refund';

    await this.saveNotification({
      userId: event.payload.userId,
      messageKey,
      arguments: this.toArguments(event.payload),
      type: NotificationType.SYSTEM,
      targetType: null,
      targetId: null,
      priority: NotificationPriority.MEDIUM,
    });
  }

  @OnEvent(ReferralConsumedEvent.eventName)
  async handleReferralConsumed(event: ReferralConsumedEvent): Promise<void> {
    await this.saveNotification({
      userId: event.payload.userId,
      messageKey: ReferralConsumedEvent.eventName,
      arguments: this.toArguments(event.payload),
      type: NotificationType.REFERRAL,
      targetType: NotificationTargetType.REFERRAL,
      targetId: event.payload.referralId,
      priority: NotificationPriority.MEDIUM,
    });
  }

  @OnEvent(AppointmentNoShowEvent.eventName)
  async handleAppointmentNoShow(event: AppointmentNoShowEvent): Promise<void> {
    await this.saveNotification({
      userId: event.payload.userId,
      messageKey: AppointmentNoShowEvent.eventName,
      arguments: this.toArguments(event.payload),
      type: NotificationType.APPOINTMENT,
      targetType: NotificationTargetType.APPOINTMENT,
      targetId: event.payload.appointmentId,
      priority: NotificationPriority.MEDIUM,
    });
  }

  @OnEvent(ReferralExpiringEvent.eventName)
  async handleReferralExpiring(event: ReferralExpiringEvent): Promise<void> {
    await this.saveNotification({
      userId: event.payload.userId,
      messageKey: ReferralExpiringEvent.eventName,
      arguments: event.payload as unknown as Record<string, unknown>,
      type: NotificationType.REFERRAL,
      targetType: NotificationTargetType.REFERRAL,
      targetId: event.payload.referralId,
      priority: NotificationPriority.MEDIUM,
    });
  }

  @OnEvent(ReferralCreatedEvent.eventName)
  async handleReferralCreated(event: ReferralCreatedEvent): Promise<void> {
    await this.saveNotification({
      userId: event.payload.userId,
      messageKey: ReferralCreatedEvent.eventName,
      arguments: event.payload as unknown as Record<string, unknown>,
      type: NotificationType.REFERRAL,
      targetType: NotificationTargetType.REFERRAL,
      targetId: event.payload.referralId,
      priority: NotificationPriority.MEDIUM,
    });
  }

  @OnEvent(ReferralCancelledEvent.eventName)
  async handleReferralCancelled(event: ReferralCancelledEvent): Promise<void> {
    await this.saveNotification({
      userId: event.payload.userId,
      messageKey: ReferralCancelledEvent.eventName,
      arguments: event.payload as unknown as Record<string, unknown>,
      type: NotificationType.REFERRAL,
      targetType: NotificationTargetType.REFERRAL,
      targetId: event.payload.referralId,
      priority: NotificationPriority.MEDIUM,
    });
  }

  @OnEvent(DoctorScheduleRequestApprovedEvent.eventName)
  async handleScheduleApproved(
    event: DoctorScheduleRequestApprovedEvent,
  ): Promise<void> {
    await this.saveNotification({
      userId: event.payload.userId,
      messageKey: DoctorScheduleRequestApprovedEvent.eventName,
      arguments: event.payload as unknown as Record<string, unknown>,
      type: NotificationType.SYSTEM,
      targetType: null,
      targetId: null,
      priority: NotificationPriority.MEDIUM,
    });
  }

  @OnEvent(DoctorScheduleRequestRejectedEvent.eventName)
  async handleScheduleRejected(
    event: DoctorScheduleRequestRejectedEvent,
  ): Promise<void> {
    await this.saveNotification({
      userId: event.payload.userId,
      messageKey: DoctorScheduleRequestRejectedEvent.eventName,
      arguments: event.payload as unknown as Record<string, unknown>,
      type: NotificationType.SYSTEM,
      targetType: null,
      targetId: null,
      priority: NotificationPriority.MEDIUM,
    });
  }

  @OnEvent(QueuePatientCalledEvent.eventName)
  async handleQueuePatientCalled(
    event: QueuePatientCalledEvent,
  ): Promise<void> {
    await this.saveNotification({
      userId: event.payload.userId,
      messageKey: QueuePatientCalledEvent.eventName,
      arguments: event.payload as unknown as Record<string, unknown>,
      type: NotificationType.SYSTEM,
      targetType: null,
      targetId: null,
      priority: NotificationPriority.MEDIUM,
    });
  }

  @OnEvent(QueueConsultationCompletedEvent.eventName)
  async handleQueueConsultationCompleted(
    event: QueueConsultationCompletedEvent,
  ): Promise<void> {
    await this.saveNotification({
      userId: event.payload.userId,
      messageKey: QueueConsultationCompletedEvent.eventName,
      arguments: event.payload as unknown as Record<string, unknown>,
      type: NotificationType.SYSTEM,
      targetType: null,
      targetId: null,
      priority: NotificationPriority.LOW,
    });
  }

  @OnEvent(QueuePatientSkippedEvent.eventName)
  async handleQueuePatientSkipped(
    event: QueuePatientSkippedEvent,
  ): Promise<void> {
    await this.saveNotification({
      userId: event.payload.userId,
      messageKey: QueuePatientSkippedEvent.eventName,
      arguments: event.payload as unknown as Record<string, unknown>,
      type: NotificationType.SYSTEM,
      targetType: null,
      targetId: null,
      priority: NotificationPriority.MEDIUM,
    });
  }

  @OnEvent(DoctorInvitationCreatedEvent.eventName)
  async handleInvitationCreated(
    event: DoctorInvitationCreatedEvent,
  ): Promise<void> {
    await this.saveNotification({
      userId: event.payload.userId,
      messageKey: DoctorInvitationCreatedEvent.eventName,
      arguments: event.payload as unknown as Record<string, unknown>,
      type: NotificationType.SYSTEM,
      targetType: null,
      targetId: null,
      priority: NotificationPriority.MEDIUM,
    });
  }

  @OnEvent(DoctorInvitationCancelledEvent.eventName)
  async handleInvitationCancelled(
    event: DoctorInvitationCancelledEvent,
  ): Promise<void> {
    await this.saveNotification({
      userId: event.payload.userId,
      messageKey: DoctorInvitationCancelledEvent.eventName,
      arguments: event.payload as unknown as Record<string, unknown>,
      type: NotificationType.SYSTEM,
      targetType: null,
      targetId: null,
      priority: NotificationPriority.MEDIUM,
    });
  }

  @OnEvent(DoctorInvitationRejectedEvent.eventName)
  async handleInvitationRejected(
    event: DoctorInvitationRejectedEvent,
  ): Promise<void> {
    await this.saveNotification({
      userId: event.payload.userId,
      messageKey: DoctorInvitationRejectedEvent.eventName,
      arguments: event.payload as unknown as Record<string, unknown>,
      type: NotificationType.SYSTEM,
      targetType: null,
      targetId: null,
      priority: NotificationPriority.MEDIUM,
    });
  }

  private async saveNotification(params: {
    userId: number;
    messageKey: string;
    arguments: Record<string, unknown> | null;
    type: NotificationType;
    targetType: NotificationTargetType | null;
    targetId: number | null;
    priority: NotificationPriority;
  }): Promise<void> {
    const notification = this.notificationRepository.create({
      userId: params.userId,
      title: '',
      body: '',
      messageKey: params.messageKey,
      arguments: params.arguments,
      type: params.type,
      status: NotificationStatus.PENDING,
      targetType: params.targetType,
      targetId: params.targetId,
      priority: params.priority,
    });

    await this.notificationRepository.save(notification);

    // Future WebSocket/Gateway emit can be attached here.
  }

  private toArguments<T extends object>(payload: T): Record<string, unknown> {
    return payload as unknown as Record<string, unknown>;
  }
}