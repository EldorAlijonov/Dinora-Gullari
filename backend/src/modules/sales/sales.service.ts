import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { escapeRegex } from '../../common/escape-regex';
import { normalizePhone } from '../../common/phone';
import { DeletedRecord, DeletedRecordDocument } from '../backups/schemas/deleted-record.schema';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
import { SettingsService } from '../settings/settings.service';
import { TelegramService } from '../telegram/telegram.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { PaySaleDebtDto } from './dto/pay-sale-debt.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { PaymentType, Sale, SaleDocument } from './schemas/sale.schema';

@Injectable()
export class SalesService {
  constructor(
    @InjectModel(Sale.name) private readonly saleModel: Model<SaleDocument>,
    @InjectModel(DeletedRecord.name) private readonly deletedRecordModel: Model<DeletedRecordDocument>,
    private readonly telegramService: TelegramService,
    private readonly settingsService: SettingsService,
    private readonly googleSheetsService: GoogleSheetsService,
  ) {}

  async findAll(query: { paymentType?: PaymentType; date?: string; dateFrom?: string; dateTo?: string; search?: string; page?: string; limit?: string }) {
    const filter: FilterQuery<SaleDocument> = {};
    if (query.paymentType) filter.paymentType = query.paymentType;
    if (query.search) {
      const search = escapeRegex(query.search.trim());
      filter.$or = [
        { productName: new RegExp(search, 'i') },
        { customerName: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
        { telegramPhone: new RegExp(search, 'i') },
        { note: new RegExp(search, 'i') },
      ];
    }
    if (query.date) {
      const start = new Date(query.date);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filter.createdAt = { $gte: start, $lt: end };
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
    const page = Math.max(Number(query.page || 0), 0);
    const limit = Math.min(Math.max(Number(query.limit || 0), 0), 100);

    if (page && limit) {
      const [items, total] = await Promise.all([
        this.saleModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).exec(),
        this.saleModel.countDocuments(filter).exec(),
      ]);
      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      };
    }

    return this.saleModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async create(dto: CreateSaleDto, userId: string) {
    const paidAmount = Math.min(dto.paidAmount ?? dto.amount, dto.amount);
    const debtAmount = Math.max(dto.amount - paidAmount, 0);
    const settings = await this.settingsService.getSettings();
    if (settings.requirePhoneForDebtSales && debtAmount > 0 && !dto.phone) {
      throw new BadRequestException('Nasiya savdo uchun telefon raqam majburiy');
    }
    const sale = await this.saleModel.create({
      ...dto,
      phone: dto.phone ? normalizePhone(dto.phone) : '',
      telegramPhone: dto.telegramPhone ? normalizePhone(dto.telegramPhone) : '',
      paidAmount,
      debtAmount,
      costPrice: dto.costPrice || 0,
      profit: paidAmount,
      createdBy: new Types.ObjectId(userId),
    });

    void this.telegramService.sendSaleCreated(sale.telegramPhone || sale.phone, this.telegramDetails(sale)).catch(() => undefined);
    void this.telegramService.notifyAdminsNewSale(sale).catch(() => undefined);
    void this.googleSheetsService.appendSaleCreated(sale).catch(() => undefined);
    return sale;
  }

  async update(id: string, dto: UpdateSaleDto) {
    const sale = await this.saleModel.findById(id).exec();
    if (!sale) throw new NotFoundException('Sale not found');
    const amount = dto.amount ?? sale.amount;
    const paidAmount = Math.min(dto.paidAmount ?? sale.paidAmount, amount);
    const debtAmount = Math.max(amount - paidAmount, 0);
    const settings = await this.settingsService.getSettings();
    if (settings.requirePhoneForDebtSales && debtAmount > 0 && !(dto.phone || sale.phone)) {
      throw new BadRequestException('Nasiya savdo uchun telefon raqam majburiy');
    }
    Object.assign(sale, {
      ...dto,
      phone: dto.phone ? normalizePhone(dto.phone) : sale.phone,
      telegramPhone: Object.prototype.hasOwnProperty.call(dto, 'telegramPhone')
        ? dto.telegramPhone
          ? normalizePhone(dto.telegramPhone)
          : ''
        : sale.telegramPhone,
      paidAmount,
      debtAmount,
      costPrice: dto.costPrice ?? sale.costPrice ?? 0,
      profit: paidAmount,
    });
    return sale.save();
  }

  async payDebt(id: string, dto: PaySaleDebtDto, userId: string) {
    const sale = await this.saleModel.findById(id).exec();
    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.debtAmount <= 0) throw new BadRequestException('Ushbu tovar sotuvida qarz mavjud emas');
    if (dto.amount > sale.debtAmount) throw new BadRequestException('To‘lov qolgan qarzdan katta bo‘lishi mumkin emas');

    sale.paidAmount += dto.amount;
    sale.debtAmount = Math.max(sale.amount - sale.paidAmount, 0);
    sale.profit = sale.paidAmount;
    sale.payments.push({
      amount: dto.amount,
      paymentType: dto.paymentType,
      paidAt: new Date(),
      createdBy: new Types.ObjectId(userId),
    });
    const saved = await sale.save();

    void this.telegramService.sendSaleDebtPaymentReceived(saved.telegramPhone || saved.phone, this.telegramDetails(saved), dto.amount).catch(() => undefined);
    void this.telegramService.notifyAdminsDebtPayment('gift', saved, dto.amount).catch(() => undefined);
    return saved;
  }

  async sendDebtReminder(id: string) {
    const sale = await this.saleModel.findById(id).exec();
    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.debtAmount <= 0) throw new BadRequestException('Ushbu tovar sotuvida qarz mavjud emas');
    return this.telegramService.sendSaleDebtReminder(sale.telegramPhone || sale.phone, this.telegramDetails(sale));
  }

  async remove(id: string, userId?: string) {
    const sale = await this.saleModel.findById(id).exec();
    if (!sale) throw new NotFoundException('Sale not found');

    await this.deletedRecordModel.create({
      collection: 'sales',
      recordId: id,
      record: sale.toObject(),
      deletedBy: userId ? new Types.ObjectId(userId) : undefined,
      deletedAt: new Date(),
    });
    await sale.deleteOne();

    return { deleted: true };
  }

  private telegramDetails(sale: SaleDocument) {
    return {
      customerName: sale.customerName,
      productName: sale.productName,
      amount: sale.amount,
      paidAmount: sale.paidAmount,
      debtAmount: sale.debtAmount,
      paymentType: sale.paymentType,
      note: sale.note,
    };
  }
}
