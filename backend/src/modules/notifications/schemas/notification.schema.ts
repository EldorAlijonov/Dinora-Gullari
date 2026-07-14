import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;
export type NotificationStatus = 'sent' | 'failed';

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: String, required: true, trim: true })
  phone: string;

  @Prop({
    type: String,
    required: true,
    enum: [
      'order_accepted',
      'order_ready',
      'order_status',
      'pickup_due',
      'debt_reminder',
      'debt_payment',
      'sale_created',
      'sale_debt_reminder',
      'sale_debt_payment',
    ],
  })
  type: string;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: String, required: true, enum: ['sent', 'failed'] })
  status: NotificationStatus;

  @Prop({ type: Date })
  sentAt?: Date;

  @Prop({ type: Date })
  resolvedAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
