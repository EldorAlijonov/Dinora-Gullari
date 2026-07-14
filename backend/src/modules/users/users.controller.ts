import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: { userId: string; email: string; role: string }) {
    return this.usersService.findById(user.userId);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: { userId: string },
    @Body() body: { fullName?: string; phone?: string; email?: string; avatarUrl?: string },
  ) {
    return this.usersService.updateProfile(user.userId, body);
  }

  @Post('me/change-password')
  changePassword(@CurrentUser() user: { userId: string }, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.usersService.changePassword(user.userId, body);
  }
}
