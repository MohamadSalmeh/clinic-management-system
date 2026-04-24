import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { Notification } from './entities/notification.entity';


@Module({
  imports: [TypeOrmModule.forFeature([Notification]), UsersModule],
  exports: [ TypeOrmModule],
})
export class NotificationsModule {}
