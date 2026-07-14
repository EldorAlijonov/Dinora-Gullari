import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Sale, SaleDocument } from '../sales/schemas/sale.schema';

type DashboardStats = {
  totalTrade: number;
  tradePeriods: {
    daily: number;
    weekly: number;
    monthly: number;
    total: number;
  };
  flowerRevenue: number;
  giftRevenue: number;
  debtBreakdown: {
    flowers: number;
    gifts: number;
    total: number;
  };
  todaySales: number;
  todayProfit: number;
  todayPayments: Record<string, number>;
  totalDebt: number;
  totalOrders: number;
  todayOrders: number;
  pickupToday: number;
  upcomingOrders: number;
  readyOrders: number;
  debtOrders: number;
  overdueOrders: number;
};

type DashboardCharts = {
  weeklySales: Array<{ date: string; amount: number; profit: number }>;
  paymentTypes: Array<{ name: string; value: number }>;
  orderStatuses: Array<{ name: string; value: number }>;
};

export type DashboardResponse = {
  stats: DashboardStats;
  charts: DashboardCharts;
  pickupTodayOrders: Order[];
  upcomingOrders: Order[];
  readyOrders: Order[];
  debtOrders: Order[];
  overdueOrders: Order[];
};

const PICKUP_SOON_HOURS = 24;
const ACTIVE_ORDER_STATUSES = { $nin: ['picked_up', 'cancelled'] };

function dayBounds(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function weekBounds(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function monthBounds(date = new Date()) {
  const start = new Date(date);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(start.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Sale.name) private readonly saleModel: Model<SaleDocument>,
  ) {}

  async overview(): Promise<DashboardResponse> {
    const now = new Date();
    const today = dayBounds(now);
    const week = weekBounds(now);
    const month = monthBounds(now);
    const soonUntil = addHours(now, PICKUP_SOON_HOURS);

    const totalOrdersFilter: FilterQuery<OrderDocument> = { status: { $ne: 'cancelled' } };
    const todayOrdersFilter: FilterQuery<OrderDocument> = { createdAt: { $gte: today.start, $lte: today.end } };
    const upcomingOrdersFilter: FilterQuery<OrderDocument> = {
      pickupDate: { $gte: now, $lte: soonUntil },
      status: ACTIVE_ORDER_STATUSES,
    };
    const pickupTodayFilter: FilterQuery<OrderDocument> = {
      pickupDate: { $gte: today.start, $lte: today.end },
      status: ACTIVE_ORDER_STATUSES,
    };
    const readyOrdersFilter: FilterQuery<OrderDocument> = { status: 'ready' };
    const debtOrdersFilter: FilterQuery<OrderDocument> = { debtAmount: { $gt: 0 }, status: { $ne: 'cancelled' } };
    const overdueOrdersFilter: FilterQuery<OrderDocument> = {
      pickupDate: { $lt: now },
      status: ACTIVE_ORDER_STATUSES,
    };

    const [
      flowerTrade,
      giftTrade,
      dailyTrade,
      weeklyTrade,
      monthlyTrade,
      flowerDebt,
      giftDebt,
      todaySales,
      todayPayments,
      weeklySales,
      paymentTypes,
      orderStatuses,
      totalOrders,
      todayOrders,
      pickupToday,
      upcomingOrdersCount,
      readyOrdersCount,
      debtOrdersCount,
      overdueOrders,
      pickupTodayOrders,
      upcomingOrders,
      readyOrders,
      debtOrders,
      overdueOrdersList,
    ] = await Promise.all([
      this.orderModel.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: null,
            gross: { $sum: '$totalAmount' },
            paid: { $sum: { $subtract: ['$totalAmount', '$debtAmount'] } },
          },
        },
      ]),
      this.saleModel.aggregate([
        {
          $group: {
            _id: null,
            gross: { $sum: '$amount' },
            paid: { $sum: '$paidAmount' },
          },
        },
      ]),
      this.tradeTotal({ createdAt: { $gte: today.start, $lte: today.end } }),
      this.tradeTotal({ createdAt: { $gte: week.start, $lte: week.end } }),
      this.tradeTotal({ createdAt: { $gte: month.start, $lte: month.end } }),
      this.orderModel.aggregate([
        { $match: { debtAmount: { $gt: 0 }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$debtAmount' } } },
      ]),
      this.saleModel.aggregate([
        { $match: { debtAmount: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$debtAmount' } } },
      ]),
      this.saleModel.aggregate([
        { $match: { createdAt: { $gte: today.start, $lte: today.end } } },
        {
          $group: {
            _id: null,
            amount: { $sum: '$amount' },
            profit: { $sum: { $ifNull: ['$profit', { $subtract: ['$amount', '$costPrice'] }] } },
          },
        },
      ]),
      this.saleModel.aggregate([
        { $match: { createdAt: { $gte: today.start, $lte: today.end } } },
        { $group: { _id: '$paymentType', value: { $sum: '$amount' } } },
      ]),
      this.saleModel.aggregate([
        { $match: { createdAt: { $gte: daysAgo(6) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            amount: { $sum: '$amount' },
            profit: { $sum: { $ifNull: ['$profit', { $subtract: ['$amount', '$costPrice'] }] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      this.saleModel.aggregate([{ $group: { _id: '$paymentType', value: { $sum: '$amount' } } }]),
      this.orderModel.aggregate([{ $group: { _id: '$status', value: { $sum: 1 } } }]),
      this.count(totalOrdersFilter),
      this.count(todayOrdersFilter),
      this.count(pickupTodayFilter),
      this.count(upcomingOrdersFilter),
      this.count(readyOrdersFilter),
      this.count(debtOrdersFilter),
      this.count(overdueOrdersFilter),
      this.findCompact(pickupTodayFilter, { pickupDate: 1 }, 10),
      this.findCompact(upcomingOrdersFilter, { pickupDate: 1 }, 10),
      this.findCompact(readyOrdersFilter, { updatedAt: -1 }, 10),
      this.findCompact(debtOrdersFilter, { debtAmount: -1, pickupDate: 1 }, 10),
      this.findCompact(overdueOrdersFilter, { pickupDate: 1 }, 10),
    ]);

    return {
      stats: {
        totalTrade: (flowerTrade[0]?.gross || 0) + (giftTrade[0]?.gross || 0),
        tradePeriods: {
          daily: dailyTrade,
          weekly: weeklyTrade,
          monthly: monthlyTrade,
          total: (flowerTrade[0]?.gross || 0) + (giftTrade[0]?.gross || 0),
        },
        flowerRevenue: flowerTrade[0]?.paid || 0,
        giftRevenue: giftTrade[0]?.paid || 0,
        debtBreakdown: {
          flowers: flowerDebt[0]?.total || 0,
          gifts: giftDebt[0]?.total || 0,
          total: (flowerDebt[0]?.total || 0) + (giftDebt[0]?.total || 0),
        },
        todaySales: todaySales[0]?.amount || 0,
        todayProfit: todaySales[0]?.profit || 0,
        todayPayments: todayPayments.reduce<Record<string, number>>((acc, item) => {
          acc[item._id] = item.value;
          return acc;
        }, {}),
        totalDebt: (flowerDebt[0]?.total || 0) + (giftDebt[0]?.total || 0),
        totalOrders,
        todayOrders,
        pickupToday,
        upcomingOrders: upcomingOrdersCount,
        readyOrders: readyOrdersCount,
        debtOrders: debtOrdersCount,
        overdueOrders,
      },
      charts: {
        weeklySales: weeklySales.map((item) => ({ date: item._id, amount: item.amount, profit: item.profit })),
        paymentTypes: paymentTypes.map((item) => ({ name: item._id, value: item.value })),
        orderStatuses: orderStatuses.map((item) => ({ name: item._id, value: item.value })),
      },
      pickupTodayOrders,
      upcomingOrders,
      readyOrders,
      debtOrders,
      overdueOrders: overdueOrdersList,
    };
  }

  private count(filter: FilterQuery<OrderDocument>): Promise<number> {
    return this.orderModel.countDocuments(filter).exec();
  }

  private findCompact(filter: FilterQuery<OrderDocument>, sort: Record<string, 1 | -1>, limit: number): Promise<Order[]> {
    return this.orderModel
      .find(filter)
      .sort(sort)
      .limit(limit)
      .select('customerName phone telegramPhone orderText totalAmount prepaidAmount debtAmount pickupDate status isTelegramNotified createdAt updatedAt note')
      .lean<Order[]>()
      .exec();
  }

  private async tradeTotal(dateFilter: FilterQuery<OrderDocument> = {}): Promise<number> {
    const [orders, sales] = await Promise.all([
      this.orderModel.aggregate([
        { $match: { status: { $ne: 'cancelled' }, ...dateFilter } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      this.saleModel.aggregate([
        { $match: dateFilter },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    return (orders[0]?.total || 0) + (sales[0]?.total || 0);
  }
}
