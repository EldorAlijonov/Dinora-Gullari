import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { TelegramService } from './telegram.service';

@Injectable()
export class TelegramUpdateService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly telegramService: TelegramService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async notifyPickupDueOrders() {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const orders = await this.orderModel
      .find({ pickupDate: { $gte: now, $lte: end }, status: { $in: ['ready', 'in_progress'] }, isTelegramNotified: false })
      .limit(30)
      .exec();

    for (const order of orders) {
      await this.telegramService.sendPickupDue(order.telegramPhone || order.phone, {
        customerName: order.customerName,
        orderText: order.orderText,
        pickupDate: order.pickupDate,
        totalAmount: order.totalAmount,
        prepaidAmount: order.prepaidAmount,
        debtAmount: order.debtAmount,
        note: order.note,
      });
      order.isTelegramNotified = true;
      await order.save();
    }

    await this.telegramService.notifyAdminsImportantAlerts();
  }
}
