import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

type CookieSameSite = 'lax' | 'strict' | 'none';

function durationToMs(value = '12h') {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 12 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * multipliers[unit as keyof typeof multipliers];
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: (this.config.get<string>('COOKIE_SAME_SITE') || 'lax') as CookieSameSite,
      path: '/',
    };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(dto);
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN') || result.expiresIn || '12h';
    response.cookie('access_token', result.accessToken, {
      ...this.cookieOptions(),
      maxAge: durationToMs(expiresIn),
    });
    return { expiresIn, user: result.user };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: { userId: string; email: string; role: string }) {
    return user;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token', this.cookieOptions());
    return { loggedOut: true };
  }
}
