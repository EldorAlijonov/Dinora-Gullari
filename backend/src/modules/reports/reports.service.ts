import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Sale, SaleDocument } from '../sales/schemas/sale.schema';

export type ProfitGroupReport = {
  _id: string;
  amount: number;
  profit: number;
};

export type PaymentTypeReport = {
  _id: string;
  amount: number;
};

type TopDebtorOrder = {
  _id: unknown;
  customerName: string;
  phone: string;
  telegramPhone?: string;
  orderText: string;
  debtAmount: number;
};

export type TopDebtorReport = TopDebtorOrder & {
  remainingAmount: number;
};

export type ProfitableDayReport = {
  _id: string;
  profit: number;
};

export type ReportsOverview = {
  paymentTypes: PaymentTypeReport[];
  topDebtors: TopDebtorReport[];
  profitableDays: ProfitableDayReport[];
};

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Sale.name) private readonly saleModel: Model<SaleDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) {}

  daily(): Promise<ProfitGroupReport[]> {
    return this.groupProfit('%Y-%m-%d', 14);
  }

  weekly(): Promise<ProfitGroupReport[]> {
    return this.groupProfit('%Y-W%U', 12);
  }

  monthly(): Promise<ProfitGroupReport[]> {
    return this.groupProfit('%Y-%m', 12);
  }

  yearly(): Promise<ProfitGroupReport[]> {
    return this.groupProfit('%Y', 5);
  }

  async overview(): Promise<ReportsOverview> {
    const [paymentTypes, topDebtors, profitableDays] = await Promise.all([
      this.saleModel.aggregate<PaymentTypeReport>([{ $group: { _id: '$paymentType', amount: { $sum: '$amount' } } }]).exec(),
      this.orderModel
        .find({ debtAmount: { $gt: 0 }, status: { $ne: 'cancelled' } })
        .sort({ debtAmount: -1 })
        .limit(8)
        .select('customerName phone telegramPhone orderText debtAmount')
        .lean<TopDebtorOrder[]>()
        .exec(),
      this.saleModel.aggregate<ProfitableDayReport>([
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            profit: { $sum: { $ifNull: ['$profit', { $subtract: ['$amount', '$costPrice'] }] } },
          },
        },
        { $sort: { profit: -1 } },
        { $limit: 8 },
      ]).exec(),
    ]);
    return {
      paymentTypes,
      topDebtors: topDebtors.map((order) => ({ ...order, remainingAmount: order.debtAmount })),
      profitableDays,
    };
  }

  private groupProfit(format: string, limit: number): Promise<ProfitGroupReport[]> {
    return this.saleModel.aggregate<ProfitGroupReport>([
      {
        $group: {
          _id: { $dateToString: { format, date: '$createdAt' } },
          amount: { $sum: '$amount' },
          profit: { $sum: { $ifNull: ['$profit', { $subtract: ['$amount', '$costPrice'] }] } },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: limit },
      { $sort: { _id: 1 } },
    ]).exec();
  }
}
