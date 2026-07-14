import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { normalizePhone } from '../../common/phone';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Sale, SaleDocument } from '../sales/schemas/sale.schema';
import { Notification, NotificationDocument, NotificationStatus } from './schemas/notification.schema';

type AdminNotification = {
  id: string;
  order: number;
  type: string;
  tone: 'danger' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  amount?: number;
  createdAt: Date;
  url?: string;
  notificationId?: string;
};

type LeanOrder = Order & { _id: unknown; createdAt: Date; updatedAt: Date };
type LeanSale = Sale & { _id: unknown; createdAt: Date; updatedAt: Date };
type LeanNotification = Notification & { _id: unknown; createdAt: Date; updatedAt: Date };

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private readonly model: Model<NotificationDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Sale.name) private readonly saleModel: Model<SaleDocument>,
  ) {}

  async create(phone: string, type: string, message: string, status: NotificationStatus) {
    const normalizedPhone = normalizePhone(phone);
    if (status === 'sent') {
      await this.model
        .updateMany(
          { phone: normalizedPhone, type, status: 'failed', $or: [{ resolvedAt: { $exists: false } }, { resolvedAt: null }] },
          { resolvedAt: new Date() },
        )
        .exec();
    }

    return this.model.create({
      phone: normalizedPhone,
      type,
      message,
      status,
      sentAt: status === 'sent' ? new Date() : undefined,
    });
  }

  async adminNotifications() {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const unresolved = { $or: [{ resolvedAt: { $exists: false } }, { resolvedAt: null }] };

    const [overdueOrders, pickupToday, readyOrders, debtOrders, debtSales, failedTelegram, sentTelegram] = await Promise.all([
      this.orderModel
        .find({ pickupDate: { $lt: now }, status: { $nin: ['picked_up', 'cancelled'] } })
        .sort({ pickupDate: 1 })
        .limit(8)
        .lean<LeanOrder[]>()
        .exec(),
      this.orderModel
        .find({ pickupDate: { $gte: todayStart, $lte: todayEnd }, status: { $nin: ['picked_up', 'cancelled'] } })
        .sort({ pickupDate: 1 })
        .limit(8)
        .lean<LeanOrder[]>()
        .exec(),
      this.orderModel.find({ status: 'ready' }).sort({ updatedAt: -1 }).limit(8).lean<LeanOrder[]>().exec(),
      this.orderModel
        .find({ debtAmount: { $gt: 0 }, status: { $ne: 'cancelled' } })
        .sort({ debtAmount: -1 })
        .limit(8)
        .lean<LeanOrder[]>()
        .exec(),
      this.saleModel.find({ debtAmount: { $gt: 0 } }).sort({ createdAt: -1 }).limit(8).lean<LeanSale[]>().exec(),
      this.model.find({ status: 'failed', ...unresolved }).sort({ createdAt: -1 }).limit(8).lean<LeanNotification[]>().exec(),
      this.model.find({ status: 'sent', ...unresolved }).sort({ sentAt: -1, createdAt: -1 }).limit(8).lean<LeanNotification[]>().exec(),
    ]);

    const items: Omit<AdminNotification, 'order'>[] = [
      ...overdueOrders.map((order) => ({
        id: `overdue-${order._id}`,
        type: 'overdue_order',
        tone: 'danger' as const,
        title: 'Kechikkan gul buyurtmasi',
        message: `${order.customerName} buyurtmasini olib ketish vaqti o‘tib ketgan.`,
        amount: order.totalAmount,
        createdAt: order.pickupDate,
        url: `/orders?filter=overdue&highlight=${order._id}`,
      })),
      ...pickupToday.map((order) => ({
        id: `pickup-${order._id}`,
        type: 'pickup_today',
        tone: 'warning' as const,
        title: 'Bugun olib ketiladigan buyurtma',
        message: `${order.customerName} gul buyurtmasini bugun olib ketadi.`,
        amount: order.totalAmount,
        createdAt: order.pickupDate,
        url: `/orders?filter=pickup_today&highlight=${order._id}`,
      })),
      ...readyOrders.map((order) => ({
        id: `ready-${order._id}`,
        type: 'ready_order',
        tone: 'success' as const,
        title: 'Tayyor gul buyurtmasi',
        message: `${order.customerName} buyurtmasi tayyor, topshirishni nazorat qiling.`,
        amount: order.totalAmount,
        createdAt: order.updatedAt,
        url: `/orders?status=ready&highlight=${order._id}`,
      })),
      ...debtOrders.map((order) => ({
        id: `flower-debt-${order._id}`,
        type: 'flower_debt',
        tone: 'warning' as const,
        title: 'Gul buyurtmasida nasiya',
        message: `${order.customerName} buyurtmasida qolgan qarz bor.`,
        amount: order.debtAmount,
        createdAt: order.updatedAt,
        url: `/debts?search=${encodeURIComponent(order.phone)}`,
      })),
      ...debtSales.map((sale) => ({
        id: `gift-debt-${sale._id}`,
        type: 'gift_debt',
        tone: 'warning' as const,
        title: 'Sovg‘a/tovar nasiyaga sotildi',
        message: `${sale.productName || 'Sovg‘a/tovar'} bo'yicha qolgan qarz bor.`,
        amount: sale.debtAmount,
        createdAt: sale.createdAt,
        url: `/debts?source=gift&search=${encodeURIComponent(sale.phone || sale.telegramPhone || sale.productName || '')}`,
      })),
      ...failedTelegram.map((notification) => ({
        id: `telegram-${notification._id}`,
        notificationId: String(notification._id),
        type: 'telegram_failed',
        tone: 'danger' as const,
        title: 'Telegram xabar yuborilmadi',
        message: `${notification.phone}: ${notification.message}`,
        createdAt: notification.createdAt,
      })),
      ...sentTelegram.map((notification) => ({
        id: `telegram-sent-${notification._id}`,
        notificationId: String(notification._id),
        type: 'telegram_sent',
        tone: 'success' as const,
        title: 'Telegram xabar yetkazildi',
        message: `${notification.phone}: ${this.telegramTypeLabel(notification.type)} muvaffaqiyatli yuborildi.`,
        createdAt: notification.sentAt || notification.createdAt,
      })),
    ];

    return items
      .sort((a, b) => {
        const priority = { danger: 0, warning: 1, info: 2, success: 3 };
        return priority[a.tone] - priority[b.tone] || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 30)
      .map((item, index) => ({ ...item, order: index + 1 }));
  }

  async resolve(id: string) {
    await this.model.findByIdAndUpdate(id, { resolvedAt: new Date() }).exec();
    return { resolved: true };
  }

  async resolveSent() {
    const result = await this.model
      .updateMany(
        { status: 'sent', $or: [{ resolvedAt: { $exists: false } }, { resolvedAt: null }] },
        { resolvedAt: new Date() },
      )
      .exec();
    return { resolved: true, count: result.modifiedCount || 0 };
  }

  private telegramTypeLabel(type: string) {
    const labels: Record<string, string> = {
      order_accepted: 'Buyurtma qabul qilindi xabari',
      order_ready: 'Buyurtma tayyor xabari',
      order_status: 'Buyurtma holati xabari',
      pickup_due: 'Olib ketish vaqti eslatmasi',
      debt_reminder: 'Qarzdorlik eslatmasi',
      debt_payment: 'Qarz to‘lovi xabari',
      sale_created: 'Sovg‘a/tovar xaridi xabari',
      sale_debt_reminder: 'Sovg‘a/tovar qarzdorlik eslatmasi',
      sale_debt_payment: 'Sovg‘a/tovar qarz to‘lovi xabari',
    };
    return labels[type] || 'Telegram xabar';
  }
}
