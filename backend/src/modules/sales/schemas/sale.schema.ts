import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SaleDocument = HydratedDocument<Sale>;
export type PaymentType = 'cash' | 'card' | 'click' | 'payme' | 'debt';
export type SaleDebtPaymentType = 'cash' | 'card' | 'click' | 'payme';

@Schema({ _id: false })
export class SaleDebtPayment {
  @Prop({ type: Number, required: true, min: 0 })
  amount: number;

  @Prop({ type: String, required: true, enum: ['cash', 'card', 'click', 'payme'] })
  paymentType: SaleDebtPaymentType;

  @Prop({ type: Date, default: Date.now })
  paidAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;
}

export const SaleDebtPaymentSchema = SchemaFactory.createForClass(SaleDebtPayment);

@Schema({ timestamps: true })
export class Sale {
  @Prop({ type: String, default: 'Sovga/tovar', trim: true })
  productName: string;

  @Prop({ type: String, default: '', trim: true })
  customerName: string;

  @Prop({ type: String, default: '', trim: true, index: true })
  phone: string;

  @Prop({ type: String, default: '', trim: true, index: true })
  telegramPhone: string;

  @Prop({ type: Number, required: true, min: 0 })
  amount: number;

  @Prop({ type: Number, default: 0, min: 0 })
  paidAmount: number;

  @Prop({ type: Number, default: 0, min: 0 })
  debtAmount: number;

  @Prop({ type: Number, default: 0, min: 0 })
  costPrice: number;

  @Prop({ type: Number, default: 0 })
  profit: number;

  @Prop({ type: String, enum: ['cash', 'card', 'click', 'payme', 'debt'], required: true, index: true })
  paymentType: PaymentType;

  @Prop({ type: String, default: '' })
  note: string;

  @Prop({ type: [SaleDebtPaymentSchema], default: [] })
  payments: SaleDebtPayment[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);
