import { Controller, Get, Headers, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { AuthRolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { ActiveUserData, UserRole } from '../utils';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';

@Controller('notifications')
@UseGuards(AuthRolesGuard)
@Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('me')
  async getNotificationsForUser(
    @CurrentUser() user: ActiveUserData,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<Array<Notification & { title: string; body: string }>> {
    return this.notificationsService.getNotificationsForUser(
      Number(user.sub),
      acceptLanguage,
    );
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentUser() user: ActiveUserData,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Notification> {
    return this.notificationsService.markAsRead(id, Number(user.sub));
  }

  @Patch('read-all')
  async markAllAsRead(
    @CurrentUser() user: ActiveUserData,
  ): Promise<{ updatedCount: number }> {
    return this.notificationsService.markAllAsRead(Number(user.sub));
  }
}
