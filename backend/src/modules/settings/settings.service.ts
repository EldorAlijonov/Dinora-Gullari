import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { normalizeGooglePrivateKey } from '../../common/google-private-key';
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
      telegramAdminIds: Array.isArray(body.telegramAdminIds) ? this.cleanTelegramAdminIds(body.telegramAdminIds) : undefined,
      requirePhoneForDebtSales: body.requirePhoneForDebtSales,
      debtReminderAfterDays: body.debtReminderAfterDays,
      preventSameDayDebtReminder: body.preventSameDayDebtReminder,
      debtReminderText: body.debtReminderText,
      googleSheetsEnabled: body.googleSheetsEnabled,
      googleSheetsSpreadsheetId: body.googleSheetsSpreadsheetId,
      googleSheetsServiceAccountEmail: body.googleSheetsServiceAccountEmail,
      googleSheetsPrivateKey: body.googleSheetsPrivateKey === undefined ? undefined : normalizeGooglePrivateKey(body.googleSheetsPrivateKey),
      googleSheetsOrdersSheet: body.googleSheetsOrdersSheet,
      googleSheetsSalesSheet: body.googleSheetsSalesSheet,
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

  async getTelegramAdminIds() {
    const settings = await this.getSettings();
    return this.cleanTelegramAdminIds(settings?.telegramAdminIds || []);
  }

  async addTelegramAdminId(chatId: string) {
    const cleaned = this.cleanTelegramAdminIds([chatId])[0];
    if (!cleaned) return this.getSettings();
    return this.settingsModel
      .findOneAndUpdate({ key: SETTINGS_KEY }, { $setOnInsert: { key: SETTINGS_KEY }, $addToSet: { telegramAdminIds: cleaned } }, { upsert: true, new: true })
      .exec();
  }

  async removeTelegramAdminId(chatId: string) {
    const cleaned = this.cleanTelegramAdminIds([chatId])[0];
    if (!cleaned) return this.getSettings();
    return this.settingsModel.findOneAndUpdate({ key: SETTINGS_KEY }, { $pull: { telegramAdminIds: cleaned } }, { upsert: true, new: true }).exec();
  }

  private cleanTelegramAdminIds(values: string[]) {
    return [...new Set(values.map((value) => String(value || '').trim()).filter((value) => /^-?\d+$/.test(value)))];
  }
}
