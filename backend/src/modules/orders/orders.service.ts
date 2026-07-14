import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { escapeRegex } from '../../common/escape-regex';
import { normalizePhone } from '../../common/phone';
import { DeletedRecord, DeletedRecordDocument } from '../backups/schemas/deleted-record.schema';
import { TelegramService } from '../telegram/telegram.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PayOrderDebtDto } from './dto/pay-order-debt.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(DeletedRecord.name) private readonly deletedRecordModel: Model<DeletedRecordDocument>,
    private readonly telegramService: TelegramService,
  ) {}

  async findAll(query: { status?: OrderStatus; search?: string; date?: string; dateFrom?: string; dateTo?: string; page?: string; limit?: string; filter?: 'today' | 'pickup_today' | 'upcoming' | 'debt' | 'overdue' }) {
    const filter: FilterQuery<OrderDocument> = {};
    const now = new Date();
    if (query.status) filter.status = query.status;
    if (query.search) {
      const search = escapeRegex(query.search.trim());
      filter.$or = [
        { customerName: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
        { telegramPhone: new RegExp(search, 'i') },
        { orderText: new RegExp(search, 'i') },
      ];
    }
    if (query.date) {
      const start = new Date(query.date);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filter.pickupDate = { $gte: start, $lt: end };
    }
    if (query.dateFrom || query.dateTo) {
      filter.createdAt = {};
      if (query.dateFrom) {
        const start = new Date(query.dateFrom);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (query.dateTo) {
        const end = new Date(query.dateTo);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    if (query.filter === 'today') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }
    if (query.filter === 'pickup_today') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      filter.pickupDate = { $gte: start, $lte: end };
      filter.status = { $nin: ['picked_up', 'cancelled'] };
    }
    if (query.filter === 'upcoming') {
      const soonUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      filter.pickupDate = { $gte: now, $lte: soonUntil };
      filter.status = { $nin: ['picked_up', 'cancelled'] };
    }
    if (query.filter === 'debt') {
      filter.debtAmount = { $gt: 0 };
      filter.status = { $ne: 'cancelled' };
    }
    if (query.filter === 'overdue') {
      filter.pickupDate = { $lt: now };
      filter.status = { $nin: ['picked_up', 'cancelled'] };
    }
    const page = Math.max(Number(query.page || 0), 0);
    const limit = Math.min(Math.max(Number(query.limit || 0), 0), 100);

    if (page && limit) {
      const [items, total] = await Promise.all([
        this.orderModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).exec(),
        this.orderModel.countDocuments(filter).exec(),
      ]);
      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      };
    }

    return this.orderModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string) {
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async create(dto: CreateOrderDto, userId: string) {
    const order = await this.orderModel.create({
      ...dto,
      phone: normalizePhone(dto.phone),
      telegramPhone: normalizePhone(dto.telegramPhone),
      pickupDate: new Date(dto.pickupDate),
      debtAmount: Math.max(dto.totalAmount - dto.prepaidAmount, 0),
      createdBy: new Types.ObjectId(userId),
    });
    void this.telegramService
      .sendOrderAccepted(order.telegramPhone || order.phone, this.telegramDetails(order))
      .catch(() => undefined);
    void this.telegramService.notifyAdminsNewOrder(order).catch(() => undefined);
    return order;
  }

  async update(id: string, dto: UpdateOrderDto) {
    const current = await this.findOne(id);
    const previousStatus = current.status;
    const totalAmount = dto.totalAmount ?? current.totalAmount;
    const prepaidAmount = dto.prepaidAmount ?? current.prepaidAmount;
    Object.assign(current, {
      ...dto,
      phone: dto.phone ? normalizePhone(dto.phone) : current.phone,
      telegramPhone: dto.telegramPhone ? normalizePhone(dto.telegramPhone) : current.telegramPhone,
      pickupDate: dto.pickupDate ? new Date(dto.pickupDate) : current.pickupDate,
      debtAmount: Math.max(totalAmount - prepaidAmount, 0),
    });
    if (current.status === 'ready') {
      current.isTelegramNotified = true;
    }
    const saved = await current.save();

    if (dto.status && dto.status !== 'new' && dto.status !== previousStatus) {
      void this.telegramService.sendOrderStatusChanged(saved.telegramPhone || saved.phone, dto.status, this.telegramDetails(saved)).catch(() => undefined);
    }

    return saved;
  }

  async updateStatus(id: string, status: OrderStatus) {
    const order = await this.findOne(id);
    const previousStatus = order.status;
    order.status = status;
    if (status === 'ready') {
      order.isTelegramNotified = true;
    }
    const saved = await order.save();

    if (status !== 'new' && status !== previousStatus) {
      void this.telegramService.sendOrderStatusChanged(saved.telegramPhone || saved.phone, status, this.telegramDetails(saved)).catch(() => undefined);
    }

    return saved;
  }

  async payDebt(id: string, dto: PayOrderDebtDto, userId: string) {
    const order = await this.findOne(id);
    if (order.debtAmount <= 0) {
      throw new BadRequestException('Ushbu buyurtmada qarz mavjud emas');
    }
    if (dto.amount > order.debtAmount) {
      throw new BadRequestException('To‘lov qolgan qarzdan katta bo‘lishi mumkin emas');
    }

    order.prepaidAmount += dto.amount;
    order.debtAmount = Math.max(order.totalAmount - order.prepaidAmount, 0);
    order.payments.push({
      amount: dto.amount,
      paymentType: dto.paymentType,
      paidAt: new Date(),
      createdBy: new Types.ObjectId(userId),
    });
    const saved = await order.save();

    void this.telegramService
      .sendDebtPaymentReceived(saved.telegramPhone || saved.phone, this.telegramDetails(saved), dto.amount)
      .catch(() => undefined);
    void this.telegramService.notifyAdminsDebtPayment('flower', saved, dto.amount).catch(() => undefined);

    return saved;
  }

  async sendDebtReminder(id: string) {
    const order = await this.findOne(id);
    if (order.debtAmount <= 0) {
      throw new BadRequestException('Ushbu buyurtmada qarz mavjud emas');
    }
    return this.telegramService.sendDebtReminder(order.telegramPhone || order.phone, this.telegramDetails(order));
  }

  async remove(id: string, userId?: string) {
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException('Order not found');

    await this.deletedRecordModel.create({
      collection: 'orders',
      recordId: id,
      record: order.toObject(),
      deletedBy: userId ? new Types.ObjectId(userId) : undefined,
      deletedAt: new Date(),
    });
    await order.deleteOne();

    return { deleted: true };
  }

  private telegramDetails(order: OrderDocument) {
    return {
      customerName: order.customerName,
      orderText: order.orderText,
      pickupDate: order.pickupDate,
      totalAmount: order.totalAmount,
      prepaidAmount: order.prepaidAmount,
      debtAmount: order.debtAmount,
      note: order.note,
    };
  }
}
