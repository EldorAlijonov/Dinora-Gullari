import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { sanitizeImageUrl } from '../../common/image-url';
import { AppSettings, SettingsDocument } from './schemas/settings.schema';

const SETTINGS_KEY = 'global';

@Injectable()
export class SettingsService {
  constructor(@InjectModel(AppSettings.name) private readonly settingsModel: Model<SettingsDocument>) {}

  async getSettings() {
    return this.settingsModel
      .findOneAndUpdate({ key: SETTINGS_KEY }, { $setOnInsert: { key: SETTINGS_KEY } }, { upsert: true, new: true })
      .lean()
      .exec();
  }

  async updateSettings(body: Partial<AppSettings>) {
    const allowed: Partial<AppSettings> = {
      storeName: body.storeName,
      storePhone: body.storePhone,
      storeAddress: body.storeAddress,
      workHours: body.workHours,
      logoUrl: sanitizeImageUrl(body.logoUrl, 'Do‘kon logosi'),
      telegramOrderAcceptedEnabled: body.telegramOrderAcceptedEnabled,
      telegramOrderStatusEnabled: body.telegramOrderStatusEnabled,
      telegramDebtReminderEnabled: body.telegramDebtReminderEnabled,
      telegramDebtPaymentEnabled: body.telegramDebtPaymentEnabled,
      telegramSaleCreatedEnabled: body.telegramSaleCreatedEnabled,
      requirePhoneForDebtSales: body.requirePhoneForDebtSales,
      debtReminderAfterDays: body.debtReminderAfterDays,
      preventSameDayDebtReminder: body.preventSameDayDebtReminder,
      debtReminderText: body.debtReminderText,
    };

    Object.keys(allowed).forEach((key) => {
      if (allowed[key as keyof AppSettings] === undefined) delete allowed[key as keyof AppSettings];
    });

    return this.settingsModel.findOneAndUpdate({ key: SETTINGS_KEY }, { $set: allowed }, { upsert: true, new: true }).exec();
  }

  async getStoreName() {
    const settings = await this.getSettings();
    return settings?.storeName || 'Dinora Gullari';
  }
}
