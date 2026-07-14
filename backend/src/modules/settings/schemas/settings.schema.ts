import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SettingsDocument = HydratedDocument<AppSettings>;

@Schema({ timestamps: true })
export class AppSettings {
  @Prop({ type: String, default: 'global', unique: true })
  key: string;

  @Prop({ type: String, default: 'Dinora Gullari', trim: true })
  storeName: string;

  @Prop({ type: String, default: '', trim: true })
  storePhone: string;

  @Prop({ type: String, default: '', trim: true })
  storeAddress: string;

  @Prop({ type: String, default: '', trim: true })
  workHours: string;

  @Prop({ type: String, default: '' })
  logoUrl: string;

  @Prop({ type: Boolean, default: true })
  telegramOrderAcceptedEnabled: boolean;

  @Prop({ type: Boolean, default: true })
  telegramOrderStatusEnabled: boolean;

  @Prop({ type: Boolean, default: true })
  telegramDebtReminderEnabled: boolean;

  @Prop({ type: Boolean, default: true })
  telegramDebtPaymentEnabled: boolean;

  @Prop({ type: Boolean, default: true })
  telegramSaleCreatedEnabled: boolean;

  @Prop({ type: Boolean, default: true })
  requirePhoneForDebtSales: boolean;

  @Prop({ type: Number, default: 3, min: 0 })
  debtReminderAfterDays: number;

  @Prop({ type: Boolean, default: true })
  preventSameDayDebtReminder: boolean;

  @Prop({ type: String, default: 'Qarzdorlik bo‘yicha eslatma.' })
  debtReminderText: string;
}

export const SettingsSchema = SchemaFactory.createForClass(AppSettings);
