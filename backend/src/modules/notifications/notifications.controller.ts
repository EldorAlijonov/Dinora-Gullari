import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('admin')
  adminNotifications() {
    return this.notificationsService.adminNotifications();
  }

  @Patch('sent/resolve')
  resolveSent() {
    return this.notificationsService.resolveSent();
  }

  @Patch(':id/resolve')
  resolve(@Param('id') id: string) {
    return this.notificationsService.resolve(id);
  }
}
