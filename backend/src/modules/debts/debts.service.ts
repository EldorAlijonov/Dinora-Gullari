import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { escapeRegex } from '../../common/escape-regex';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Sale, SaleDocument } from '../sales/schemas/sale.schema';

export type DebtListItem = Record<string, unknown> & {
  _id: unknown;
  debtSource: 'flower' | 'gift';
  sourceLabel: string;
  title: string;
  totalAmount: number;
  paidAmount: number;
  debtAmount: number;
  createdAt?: Date;
  updatedAt?: Date;
};

@Injectable()
export class DebtsService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Sale.name) private readonly saleModel: Model<SaleDocument>,
  ) {}

  async findAll(query: { status?: 'active' | 'paid'; search?: string; source?: 'all' | 'flower' | 'gift' }): Promise<DebtListItem[]> {
    const source = query.source || 'all';
    const [orders, sales] = await Promise.all([
      source === 'gift' ? Promise.resolve([]) : this.findOrderDebts(query),
      source === 'flower' ? Promise.resolve([]) : this.findSaleDebts(query),
    ]);

    return [...orders, ...sales].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
  }

  async stats() {
    const [orderActive, orderPaid, orderTotal, saleActive, salePaid, saleTotal] = await Promise.all([
      this.orderModel.countDocuments({ debtAmount: { $gt: 0 }, status: { $ne: 'cancelled' } }),
      this.orderModel.countDocuments({ debtAmount: 0, 'payments.0': { $exists: true } }),
      this.orderModel.aggregate([
        { $match: { debtAmount: { $gt: 0 }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, totalDebt: { $sum: '$debtAmount' } } },
      ]),
      this.saleModel.countDocuments({ debtAmount: { $gt: 0 } }),
      this.saleModel.countDocuments({ debtAmount: 0, 'payments.0': { $exists: true } }),
      this.saleModel.aggregate([
        { $match: { debtAmount: { $gt: 0 } } },
        { $group: { _id: null, totalDebt: { $sum: '$debtAmount' } } },
      ]),
    ]);

    return {
      active: orderActive + saleActive,
      paid: orderPaid + salePaid,
      totalDebt: (orderTotal[0]?.totalDebt || 0) + (saleTotal[0]?.totalDebt || 0),
      flowersDebt: orderTotal[0]?.totalDebt || 0,
      giftsDebt: saleTotal[0]?.totalDebt || 0,
    };
  }

  private async findOrderDebts(query: { status?: 'active' | 'paid'; search?: string }): Promise<DebtListItem[]> {
    const filter: FilterQuery<OrderDocument> = {};
    if (query.status === 'paid') {
      filter.debtAmount = 0;
      filter['payments.0'] = { $exists: true };
    } else {
      filter.debtAmount = { $gt: 0 };
      filter.status = { $ne: 'cancelled' };
    }

    if (query.search) {
      const search = escapeRegex(query.search.trim());
      filter.$or = [
        { customerName: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
        { telegramPhone: new RegExp(search, 'i') },
        { orderText: new RegExp(search, 'i') },
      ];
    }

    const orders = await this.orderModel.find(filter).sort({ updatedAt: -1, createdAt: -1 }).lean<Array<Order & { _id: unknown }>>().exec();
    return orders.map((order) => ({
      ...order,
      debtSource: 'flower',
      sourceLabel: 'Gul buyurtmasi',
      title: order.orderText,
      paidAmount: order.prepaidAmount,
      totalAmount: order.totalAmount,
    }));
  }

  private async findSaleDebts(query: { status?: 'active' | 'paid'; search?: string }): Promise<DebtListItem[]> {
    const filter: FilterQuery<SaleDocument> = {};
    if (query.status === 'paid') {
      filter.debtAmount = 0;
      filter['payments.0'] = { $exists: true };
    } else {
      filter.debtAmount = { $gt: 0 };
    }

    if (query.search) {
      const search = escapeRegex(query.search.trim());
      filter.$or = [
        { customerName: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
        { telegramPhone: new RegExp(search, 'i') },
        { productName: new RegExp(search, 'i') },
        { note: new RegExp(search, 'i') },
      ];
    }

    const sales = await this.saleModel.find(filter).sort({ updatedAt: -1, createdAt: -1 }).lean<Array<Sale & { _id: unknown }>>().exec();
    return sales.map((sale) => ({
      ...sale,
      debtSource: 'gift',
      sourceLabel: 'Sovga/tovar',
      title: sale.productName,
      totalAmount: sale.amount,
      status: sale.debtAmount > 0 ? 'debt' : 'paid',
      telegramPhone: sale.telegramPhone || '',
      pickupDate: null,
    }));
  }
}
