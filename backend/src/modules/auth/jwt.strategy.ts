import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UsersService } from '../users/users.service';

type JwtPayload = { sub: string; email: string; role: string };

function cookieExtractor(request: Request) {
  const cookieHeader = request?.headers?.cookie;
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  const accessToken = cookies.find((cookie) => cookie.startsWith('access_token='));
  return accessToken ? decodeURIComponent(accessToken.split('=').slice(1).join('=')) : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
