import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { normalizePhone } from '../../common/phone';
import { sanitizeImageUrl } from '../../common/image-url';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  findByLogin(login: string) {
    const normalizedPhone = login.includes('@') ? null : normalizePhone(login);
    return this.userModel
      .findOne(login.includes('@') ? { email: login.toLowerCase() } : { phone: normalizedPhone })
      .select('+password')
      .exec();
  }

  findById(id: string) {
    return this.userModel.findById(id).select('-password').exec();
  }

  async updateProfile(id: string, body: { fullName?: string; phone?: string; email?: string; avatarUrl?: string }) {
    const update = {
      fullName: body.fullName,
      phone: body.phone ? normalizePhone(body.phone) : undefined,
      email: body.email ? body.email.toLowerCase() : undefined,
      avatarUrl: sanitizeImageUrl(body.avatarUrl, 'Profil rasmi'),
    };

    Object.keys(update).forEach((key) => {
      if (update[key as keyof typeof update] === undefined) delete update[key as keyof typeof update];
    });

    const user = await this.userModel.findByIdAndUpdate(id, update, { new: true }).select('-password').exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async changePassword(id: string, body: { currentPassword: string; newPassword: string }) {
    const user = await this.userModel.findById(id).select('+password').exec();
    if (!user) throw new NotFoundException('User not found');
    if (!(await bcrypt.compare(body.currentPassword, user.password))) {
      throw new BadRequestException('Joriy parol noto‘g‘ri');
    }
    user.password = await bcrypt.hash(body.newPassword, 10);
    await user.save();
    return { changed: true };
  }
}
