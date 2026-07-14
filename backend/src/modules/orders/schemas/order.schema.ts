import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;
export type OrderStatus = 'new' | 'in_progress' | 'ready' | 'picked_up' | 'cancelled';
export type DebtPaymentType = 'cash' | 'card' | 'click' | 'payme';

@Schema({ _id: false })
export class DebtPayment {
  @Prop({ type: Number, required: true, min: 0 })
  amount: number;

  @Prop({ type: String, required: true, enum: ['cash', 'card', 'click', 'payme'] })
  paymentType: DebtPaymentType;

  @Prop({ type: Date, default: Date.now })
  paidAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;
}

export const DebtPaymentSchema = SchemaFactory.createForClass(DebtPayment);

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: String, required: true, trim: true })
  customerName: string;

  @Prop({ type: String, required: true, trim: true, index: true })
  phone: string;

  @Prop({ type: String, required: true, trim: true, index: true })
  telegramPhone: string;

  @Prop({ type: String, required: true, trim: true })
  orderText: string;

  @Prop({ type: Number, required: true, min: 0 })
  totalAmount: number;

  @Prop({ type: Number, default: 0, min: 0 })
  prepaidAmount: number;

  @Prop({ type: Number, default: 0, min: 0 })
  debtAmount: number;

  @Prop({ type: Date, required: true })
  pickupDate: Date;

  @Prop({ type: String, enum: ['new', 'in_progress', 'ready', 'picked_up', 'cancelled'], default: 'new', index: true })
  status: OrderStatus;

  @Prop({ type: String, default: '' })
  note: string;

  @Prop({ type: Boolean, default: false })
  isTelegramNotified: boolean;

  @Prop({ type: [DebtPaymentSchema], default: [] })
  payments: DebtPayment[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
