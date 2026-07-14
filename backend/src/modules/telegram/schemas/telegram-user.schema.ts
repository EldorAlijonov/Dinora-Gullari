import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TelegramUserDocument = HydratedDocument<TelegramUser>;

@Schema({ collection: 'telegram_users', timestamps: true })
export class TelegramUser {
  @Prop({ type: String, required: true, unique: true })
  chatId: string;

  @Prop({ type: String, required: true, index: true })
  phone: string;

  @Prop({ type: String })
  firstName?: string;

  @Prop({ type: String })
  username?: string;
}

export const TelegramUserSchema = SchemaFactory.createForClass(TelegramUser);
