import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByLogin(dto.login);
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Login yoki parol noto‘g‘ri');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN') || '12h',
      user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, role: user.role, avatarUrl: user.avatarUrl },
    };
  }
}
