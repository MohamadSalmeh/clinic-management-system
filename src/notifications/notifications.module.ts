import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { Notification } from './entities/notification.entity';
import { NotificationI18nService } from './i18n/notification-i18n.service';
import { NotificationEventListener } from './listeners/notification-event.listener';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';


@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    UsersModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationI18nService, NotificationEventListener],
  exports: [TypeOrmModule, NotificationsService],
})
export class NotificationsModule {}
