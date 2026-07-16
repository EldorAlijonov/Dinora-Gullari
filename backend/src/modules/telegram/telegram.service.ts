import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import TelegramBot = require('node-telegram-bot-api');
import { escapeRegex } from '../../common/escape-regex';
import { normalizePhone } from '../../common/phone';
import { NotificationsService } from '../notifications/notifications.service';
import { Order, OrderDocument, OrderStatus } from '../orders/schemas/order.schema';
import { Sale, SaleDocument } from '../sales/schemas/sale.schema';
import { SettingsService } from '../settings/settings.service';
import { TelegramUser, TelegramUserDocument } from './schemas/telegram-user.schema';

type PaymentType = 'cash' | 'card' | 'click' | 'payme' | 'debt';
type AdminDebtSource = 'flower' | 'gift';

export type OrderTelegramDetails = {
  customerName: string;
  orderText: string;
  pickupDate: Date;
  totalAmount: number;
  prepaidAmount: number;
  debtAmount: number;
  note?: string;
};

export type SaleTelegramDetails = {
  customerName?: string;
  productName?: string;
  amount: number;
  paidAmount: number;
  debtAmount: number;
  paymentType: PaymentType;
  note?: string;
};

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot?: TelegramBot;
  private lastAutomaticAdminAlertAt?: Date;

  constructor(
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly settingsService: SettingsService,
    @InjectModel(TelegramUser.name) private readonly telegramUserModel: Model<TelegramUserDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Sale.name) private readonly saleModel: Model<SaleDocument>,
  ) {}

  onModuleInit() {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token || token === 'your_telegram_bot_token') {
      this.logger.warn('Telegram bot token is not configured');
      return;
    }
    this.bot = new TelegramBot(token, { polling: true });
    this.registerHandlers();
  }

  async sendOrderAccepted(phone: string, details: OrderTelegramDetails) {
    const settings = await this.settingsService.getSettings();
    if (!settings.telegramOrderAcceptedEnabled) return { sent: false };
    const message = [
      settings.storeName,
      '',
      `Assalomu alaykum, ${details.customerName}!`,
      'Buyurtmangiz qabul qilindi.',
      '',
      this.orderDetailsBlock(details),
    ].join('\n');
    return this.sendByPhone(phone, 'order_accepted', message);
  }

  async sendOrderStatusChanged(phone: string, status: OrderStatus, details: OrderTelegramDetails) {
    if (status === 'new') return { sent: false };
    const settings = await this.settingsService.getSettings();
    if (!settings.telegramOrderStatusEnabled) return { sent: false };

    const message = [
      settings.storeName,
      '',
      `Assalomu alaykum, ${details.customerName}!`,
      this.statusMessage(status),
      '',
      this.orderDetailsBlock(details),
      `Status: ${this.orderStatusLabel(status)}`,
    ].join('\n');
    return this.sendByPhone(phone, 'order_status', message);
  }

  async sendOrderReady(phone: string, details: OrderTelegramDetails) {
    const settings = await this.settingsService.getSettings();
    if (!settings.telegramOrderStatusEnabled) return { sent: false };
    const message = [
      settings.storeName,
      '',
      `Assalomu alaykum, ${details.customerName}!`,
      'Buyurtmangiz tayyor bo\'ldi.',
      '',
      this.orderDetailsBlock(details),
      'Status: Tayyor',
    ].join('\n');
    return this.sendByPhone(phone, 'order_ready', message);
  }

  async sendPickupDue(phone: string, details: OrderTelegramDetails) {
    const settings = await this.settingsService.getSettings();
    if (!settings.telegramOrderStatusEnabled) return { sent: false };
    const message = [
      settings.storeName,
      '',
      `Assalomu alaykum, ${details.customerName}!`,
      'Buyurtmani olib ketish vaqti yaqinlashdi.',
      '',
      this.orderDetailsBlock(details),
    ].join('\n');
    return this.sendByPhone(phone, 'pickup_due', message);
  }

  async sendDebtReminder(phone: string, details: OrderTelegramDetails) {
    const settings = await this.settingsService.getSettings();
    if (!settings.telegramDebtReminderEnabled) return { sent: false };
    const message = [
      settings.storeName,
      '',
      `Assalomu alaykum, ${details.customerName}!`,
      settings.debtReminderText || 'Qarzdorlik bo\'yicha eslatma.',
      '',
      this.orderDebtReminderBlock(details),
    ].join('\n');
    return this.sendByPhone(phone, 'debt_reminder', message);
  }

  async sendDebtPaymentReceived(phone: string, details: OrderTelegramDetails, paymentAmount: number) {
    const settings = await this.settingsService.getSettings();
    if (!settings.telegramDebtPaymentEnabled) return { sent: false };
    const message = [
      settings.storeName,
      '',
      `Assalomu alaykum, ${details.customerName}!`,
      details.debtAmount === 0 ? 'Buyurtmangiz bo\'yicha qarzdorlik to\'liq yopildi.' : 'Qarzingiz uchun to\'lov qabul qilindi.',
      '',
      `To'langan summa: ${this.formatMoney(paymentAmount)}`,
      this.orderDetailsBlock(details),
      '',
      'Rahmat!',
    ].join('\n');
    return this.sendByPhone(phone, 'debt_payment', message);
  }

  async sendSaleCreated(phone: string, details: SaleTelegramDetails) {
    if (!phone) return { sent: false };
    const settings = await this.settingsService.getSettings();
    if (!settings.telegramSaleCreatedEnabled) return { sent: false };

    const message =
      details.debtAmount > 0
        ? this.saleDebtMessage(details, 'Sovg\'a/tovar xaridingiz nasiyaga rasmiylashtirildi.', settings.storeName)
        : [
            settings.storeName,
            '',
            `Assalomu alaykum${details.customerName ? `, ${details.customerName}` : ''}!`,
            'Xaridingiz qabul qilindi.',
            '',
            this.saleDetailsBlock(details),
            '',
            'Rahmat!',
          ].join('\n');
    return this.sendByPhone(phone, 'sale_created', message);
  }

  async sendSaleDebtReminder(phone: string, details: SaleTelegramDetails) {
    if (!phone) return { sent: false };
    const settings = await this.settingsService.getSettings();
    if (!settings.telegramDebtReminderEnabled) return { sent: false };

    const message = this.saleDebtMessage(details, settings.debtReminderText || 'Qarzdorlik bo\'yicha eslatma.', settings.storeName);
    return this.sendByPhone(phone, 'sale_debt_reminder', message);
  }

  async sendSaleDebtPaymentReceived(phone: string, details: SaleTelegramDetails, paymentAmount: number) {
    if (!phone) return { sent: false };
    const settings = await this.settingsService.getSettings();
    if (!settings.telegramDebtPaymentEnabled) return { sent: false };

    const message = [
      settings.storeName,
      '',
      `Assalomu alaykum${details.customerName ? `, ${details.customerName}` : ''}!`,
      details.debtAmount === 0 ? 'Xaridingiz bo\'yicha qarzdorlik to\'liq yopildi.' : 'Xaridingiz bo\'yicha to\'lov qabul qilindi.',
      '',
      `To'langan summa: ${this.formatMoney(paymentAmount)}`,
      this.saleDetailsBlock(details),
      '',
      'Rahmat!',
    ].join('\n');
    return this.sendByPhone(phone, 'sale_debt_payment', message);
  }

  async notifyAdminsNewOrder(order: OrderDocument) {
    await this.sendToAdmins(
      [
        'Yangi gul buyurtmasi',
        '',
        `Mijoz: ${order.customerName}`,
        `Telefon: ${order.phone}`,
        `Buyurtma: ${order.orderText}`,
        `Olib ketish: ${this.formatDate(order.pickupDate)}`,
        `Summa: ${this.formatMoney(order.totalAmount)}`,
        `Qarz: ${this.formatMoney(order.debtAmount)}`,
      ].join('\n'),
      this.orderStatusKeyboard(String(order._id)),
    );
  }

  async notifyAdminsNewSale(sale: SaleDocument) {
    await this.sendToAdmins(
      [
        'Yangi sovg‘a/tovar sotildi',
        '',
        `Tovar: ${sale.productName || 'Sovga/tovar'}`,
        `Mijoz: ${sale.customerName || '-'}`,
        `Telefon: ${sale.phone || '-'}`,
        `Summa: ${this.formatMoney(sale.amount)}`,
        `Qarz: ${this.formatMoney(sale.debtAmount)}`,
      ].join('\n'),
    );
  }

  async notifyAdminsDebtPayment(source: AdminDebtSource, item: OrderDocument | SaleDocument, paymentAmount: number) {
    const isFlower = source === 'flower';
    const title = isFlower ? (item as OrderDocument).orderText : (item as SaleDocument).productName || 'Sovga/tovar';
    const customerName = isFlower ? (item as OrderDocument).customerName : (item as SaleDocument).customerName || '-';
    await this.sendToAdmins(
      [
        'Qarz to‘lovi qabul qilindi',
        '',
        `Turi: ${isFlower ? 'Gul buyurtmasi' : 'Sovg‘a/tovar'}`,
        `Mijoz: ${customerName}`,
        `Nomi: ${title}`,
        `To‘langan: ${this.formatMoney(paymentAmount)}`,
        `Qolgan qarz: ${this.formatMoney(item.debtAmount)}`,
      ].join('\n'),
    );
  }

  async notifyAdminsImportantAlerts(force = false) {
    if (!force && this.lastAutomaticAdminAlertAt && Date.now() - this.lastAutomaticAdminAlertAt.getTime() < 6 * 60 * 60 * 1000) {
      return;
    }
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const [pickupToday, overdue, debtOrders, debtSales] = await Promise.all([
      this.orderModel.countDocuments({ pickupDate: { $gte: todayStart, $lte: todayEnd }, status: { $nin: ['picked_up', 'cancelled'] } }),
      this.orderModel.countDocuments({ pickupDate: { $lt: now }, status: { $nin: ['picked_up', 'cancelled'] } }),
      this.orderModel.countDocuments({ debtAmount: { $gt: 0 }, status: { $ne: 'cancelled' } }),
      this.saleModel.countDocuments({ debtAmount: { $gt: 0 } }),
    ]);

    if (pickupToday + overdue + debtOrders + debtSales === 0) return;

    await this.sendToAdmins(
      [
        'Muhim ogohlantirishlar',
        '',
        `Bugun olib ketiladi: ${pickupToday}`,
        `Kechikkan buyurtmalar: ${overdue}`,
        `Gul qarzdorlari: ${debtOrders}`,
        `Sovg‘a/tovar qarzdorlari: ${debtSales}`,
      ].join('\n'),
    );
    if (!force) this.lastAutomaticAdminAlertAt = new Date();
  }

  async notifyAdminsSystemError(error: {
    requestId: string;
    timestamp: string;
    status: number;
    method: string;
    path: string;
    message: string;
    errorName: string;
    userId?: string;
    stack?: string;
  }) {
    const message = [
      'Backend xatolik',
      '',
      `Status: ${error.status}`,
      `Route: ${error.method} ${error.path}`,
      `Request ID: ${error.requestId}`,
      `Vaqt: ${error.timestamp}`,
      error.userId ? `User: ${error.userId}` : undefined,
      `Xabar: ${error.message}`,
      `Turi: ${error.errorName}`,
      error.stack ? ['', error.stack].join('\n') : undefined,
    ]
      .filter(Boolean)
      .join('\n');

    await this.sendToAdmins(message);
  }

  private async sendByPhone(phone: string, type: string, message: string) {
    const normalized = normalizePhone(phone);
    const user = await this.telegramUserModel.findOne({ phone: normalized }).exec();
    if (!this.bot || !user) {
      await this.notifications.create(normalized, type, message, 'failed');
      return { sent: false };
    }
    try {
      await this.bot.sendMessage(user.chatId, message);
      await this.notifications.create(normalized, type, message, 'sent');
      return { sent: true };
    } catch {
      this.logger.warn(`Telegram message could not be sent to ${normalized}`);
      await this.notifications.create(normalized, type, message, 'failed');
      return { sent: false };
    }
  }

  private envAdminChatIds() {
    const fromEnv = this.config.get<string>('TELEGRAM_ADMIN_IDS');
    return (fromEnv || '6874906701,1779520880')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }

  private async adminChatIds() {
    return [...new Set([...this.envAdminChatIds(), ...(await this.settingsService.getTelegramAdminIds())])];
  }

  private async isAdminChat(chatId?: number | string) {
    return chatId !== undefined && (await this.adminChatIds()).includes(String(chatId));
  }

  private async sendToAdmins(message: string, replyMarkup?: TelegramBot.SendMessageOptions['reply_markup']) {
    if (!this.bot) return;
    const adminIds = await this.adminChatIds();
    await Promise.all(
      adminIds.map((chatId) =>
        this.bot
          ?.sendMessage(chatId, message, replyMarkup ? { reply_markup: replyMarkup } : undefined)
          .catch(() => undefined),
      ),
    );
  }

  private orderStatusKeyboard(orderId: string) {
    return {
      inline_keyboard: [
        [
          { text: 'Jarayonda', callback_data: `status:${orderId}:in_progress` },
          { text: 'Tayyor', callback_data: `status:${orderId}:ready` },
        ],
        [
          { text: 'Olib ketildi', callback_data: `status:${orderId}:picked_up` },
          { text: 'Bekor qilindi', callback_data: `status:${orderId}:cancelled` },
        ],
      ],
    };
  }

  private debtReminderKeyboard(source: AdminDebtSource, id: string) {
    return {
      inline_keyboard: [[{ text: 'Qarz eslatmasi yuborish', callback_data: `debt:${source}:${id}` }]],
    };
  }

  private async assertAdmin(msg: TelegramBot.Message) {
    if (await this.isAdminChat(msg.chat.id)) return true;
    await this.bot?.sendMessage(msg.chat.id, 'Bu buyruq faqat admin uchun.');
    return false;
  }

  private async sendAdminReport(chatId: number) {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const [todayOrders, todaySales, todaySalesAgg, flowerDebt, giftDebt] = await Promise.all([
      this.orderModel.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      this.saleModel.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      this.saleModel.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, amount: { $sum: '$amount' }, paid: { $sum: '$paidAmount' }, profit: { $sum: '$profit' } } },
      ]),
      this.orderModel.aggregate([
        { $match: { debtAmount: { $gt: 0 }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$debtAmount' } } },
      ]),
      this.saleModel.aggregate([{ $match: { debtAmount: { $gt: 0 } } }, { $group: { _id: null, total: { $sum: '$debtAmount' } } }]),
    ]);
    const sales = todaySalesAgg[0] || {};
    const totalDebt = (flowerDebt[0]?.total || 0) + (giftDebt[0]?.total || 0);
    await this.bot?.sendMessage(
      chatId,
      [
        'Kunlik hisobot',
        '',
        `Bugungi buyurtmalar: ${todayOrders}`,
        `Bugungi sovg‘a/tovar sotuvlari: ${todaySales}`,
        `Bugungi savdo: ${this.formatMoney(sales.amount || 0)}`,
        `Bugungi tushum: ${this.formatMoney(sales.paid || 0)}`,
        `Bugungi foyda: ${this.formatMoney(sales.profit || 0)}`,
        `Jami qarz: ${this.formatMoney(totalDebt)}`,
      ].join('\n'),
    );
  }

  private async sendAdminOrders(chatId: number, mode: 'today' | 'overdue') {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const filter =
      mode === 'today'
        ? { pickupDate: { $gte: start, $lte: end }, status: { $nin: ['picked_up', 'cancelled'] } }
        : { pickupDate: { $lt: now }, status: { $nin: ['picked_up', 'cancelled'] } };
    const orders = await this.orderModel.find(filter).sort({ pickupDate: 1 }).limit(10).exec();
    if (orders.length === 0) {
      await this.bot?.sendMessage(chatId, mode === 'today' ? 'Bugun olib ketiladigan buyurtma yo‘q.' : 'Kechikkan buyurtma yo‘q.');
      return;
    }
    for (const order of orders) {
      await this.bot?.sendMessage(
        chatId,
        [
          mode === 'today' ? 'Bugungi buyurtma' : 'Kechikkan buyurtma',
          '',
          `Mijoz: ${order.customerName}`,
          `Telefon: ${order.phone}`,
          `Buyurtma: ${order.orderText}`,
          `Olib ketish: ${this.formatDate(order.pickupDate)}`,
          `Status: ${this.orderStatusLabel(order.status)}`,
          `Qarz: ${this.formatMoney(order.debtAmount)}`,
        ].join('\n'),
        { reply_markup: this.orderStatusKeyboard(String(order._id)) },
      );
    }
  }

  private async sendAdminDebts(chatId: number) {
    const [orders, sales] = await Promise.all([
      this.orderModel.find({ debtAmount: { $gt: 0 }, status: { $ne: 'cancelled' } }).sort({ debtAmount: -1 }).limit(5).exec(),
      this.saleModel.find({ debtAmount: { $gt: 0 } }).sort({ debtAmount: -1 }).limit(5).exec(),
    ]);
    if (orders.length + sales.length === 0) {
      await this.bot?.sendMessage(chatId, 'Qarzdorlar yo‘q.');
      return;
    }
    for (const order of orders) {
      await this.bot?.sendMessage(
        chatId,
        [`Gul qarzi`, '', `Mijoz: ${order.customerName}`, `Telefon: ${order.phone}`, `Buyurtma: ${order.orderText}`, `Qarz: ${this.formatMoney(order.debtAmount)}`].join('\n'),
        { reply_markup: this.debtReminderKeyboard('flower', String(order._id)) },
      );
    }
    for (const sale of sales) {
      await this.bot?.sendMessage(
        chatId,
        [`Sovg‘a/tovar qarzi`, '', `Mijoz: ${sale.customerName || '-'}`, `Telefon: ${sale.phone || '-'}`, `Tovar: ${sale.productName}`, `Qarz: ${this.formatMoney(sale.debtAmount)}`].join('\n'),
        { reply_markup: this.debtReminderKeyboard('gift', String(sale._id)) },
      );
    }
  }

  private async sendAdminSearch(chatId: number, query: string) {
    const search = escapeRegex(query.trim());
    if (!search) {
      await this.bot?.sendMessage(chatId, 'Qidirish uchun: /qidir Ali yoki /qidir 901234567');
      return;
    }
    const [orders, sales] = await Promise.all([
      this.orderModel
        .find({ $or: [{ customerName: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }, { telegramPhone: new RegExp(search, 'i') }, { orderText: new RegExp(search, 'i') }] })
        .sort({ createdAt: -1 })
        .limit(5)
        .exec(),
      this.saleModel
        .find({ $or: [{ productName: new RegExp(search, 'i') }, { customerName: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }, { note: new RegExp(search, 'i') }] })
        .sort({ createdAt: -1 })
        .limit(5)
        .exec(),
    ]);
    const parts = [
      'Qidiruv natijalari',
      '',
      ...orders.map((order, index) => `${index + 1}. Gul: ${order.customerName} | ${order.orderText} | ${this.formatMoney(order.debtAmount)} qarz`),
      ...sales.map((sale, index) => `${orders.length + index + 1}. Tovar: ${sale.productName} | ${sale.customerName || '-'} | ${this.formatMoney(sale.debtAmount)} qarz`),
    ];
    await this.bot?.sendMessage(chatId, orders.length + sales.length ? parts.join('\n') : 'Natija topilmadi.');
  }

  private async sendAdminHealth(chatId: number) {
    const [orders, sales, users] = await Promise.all([
      this.orderModel.countDocuments(),
      this.saleModel.countDocuments(),
      this.telegramUserModel.countDocuments(),
    ]);
    await this.bot?.sendMessage(
      chatId,
      ['Texnik holat', '', `Bot: ishlayapti`, `Backend: ishlayapti`, `Buyurtmalar: ${orders}`, `Sotuvlar: ${sales}`, `Telegram foydalanuvchilar: ${users}`, `Vaqt: ${this.formatDate(new Date())}`].join('\n'),
    );
  }

  private async sendAdminMenu(chatId: number) {
    await this.bot?.sendMessage(
      chatId,
      [
        'Admin panel',
        '',
        '/hisobot - kunlik hisobot',
        '/qarzlar - qarzdorlar ro‘yxati',
        '/bugun - bugun olib ketiladigan buyurtmalar',
        '/kechikkan - kechikkan buyurtmalar',
        '/qidir matn - buyurtma/sotuv/qarzdor qidirish',
        '/ogohlantirishlar - muhim ogohlantirishlar',
        '/holat - bot/backend holati',
        '/adminlar - admin chat ID lar',
        '/admin_qosh chat_id - admin qo\'shish',
        '/admin_ochir chat_id - adminni olib tashlash',
      ].join('\n'),
      {
        reply_markup: {
          keyboard: [
            [{ text: '/hisobot' }, { text: '/bugun' }],
            [{ text: '/qarzlar' }, { text: '/kechikkan' }],
            [{ text: '/ogohlantirishlar' }, { text: '/holat' }],
          ],
          resize_keyboard: true,
        },
      },
    );
  }

  private registerHandlers() {
    if (!this.bot) return;
    this.bot.onText(/^\/admin$/, async (msg) => {
      if (!(await this.assertAdmin(msg))) return;
      await this.sendAdminMenu(msg.chat.id);
    });

    this.bot.onText(/^\/hisobot$/, async (msg) => {
      if (await this.assertAdmin(msg)) await this.sendAdminReport(msg.chat.id);
    });

    this.bot.onText(/^\/qarzlar$/, async (msg) => {
      if (await this.assertAdmin(msg)) await this.sendAdminDebts(msg.chat.id);
    });

    this.bot.onText(/^\/bugun$/, async (msg) => {
      if (await this.assertAdmin(msg)) await this.sendAdminOrders(msg.chat.id, 'today');
    });

    this.bot.onText(/^\/kechikkan$/, async (msg) => {
      if (await this.assertAdmin(msg)) await this.sendAdminOrders(msg.chat.id, 'overdue');
    });

    this.bot.onText(/^\/qidir(?:\s+(.+))?$/, async (msg, match) => {
      if (await this.assertAdmin(msg)) await this.sendAdminSearch(msg.chat.id, match?.[1] || '');
    });

    this.bot.onText(/^\/ogohlantirishlar$/, async (msg) => {
      if (!(await this.assertAdmin(msg))) return;
      await this.notifyAdminsImportantAlerts(true);
    });

    this.bot.onText(/^\/holat$/, async (msg) => {
      if (await this.assertAdmin(msg)) await this.sendAdminHealth(msg.chat.id);
    });

    this.bot.onText(/^\/adminlar$/, async (msg) => {
      if (!(await this.assertAdmin(msg))) return;
      const adminIds = await this.adminChatIds();
      await this.bot?.sendMessage(msg.chat.id, adminIds.length ? `Admin chat ID lar:\n${adminIds.join('\n')}` : 'Admin chat ID topilmadi.');
    });

    this.bot.onText(/^\/admin_qosh(?:\s+(-?\d+))?$/, async (msg, match) => {
      if (!(await this.assertAdmin(msg))) return;
      const chatId = match?.[1];
      if (!chatId) {
        await this.bot?.sendMessage(msg.chat.id, 'Foydalanish: /admin_qosh 123456789');
        return;
      }
      await this.settingsService.addTelegramAdminId(chatId);
      await this.bot?.sendMessage(msg.chat.id, `Admin qo'shildi: ${chatId}`);
    });

    this.bot.onText(/^\/admin_ochir(?:\s+(-?\d+))?$/, async (msg, match) => {
      if (!(await this.assertAdmin(msg))) return;
      const chatId = match?.[1];
      if (!chatId) {
        await this.bot?.sendMessage(msg.chat.id, 'Foydalanish: /admin_ochir 123456789');
        return;
      }
      if (this.envAdminChatIds().includes(chatId)) {
        await this.bot?.sendMessage(msg.chat.id, 'Bu admin .env orqali berilgan, uni Settingsdan o\'chirib bo\'lmaydi.');
        return;
      }
      await this.settingsService.removeTelegramAdminId(chatId);
      await this.bot?.sendMessage(msg.chat.id, `Admin olib tashlandi: ${chatId}`);
    });

    this.bot.on('callback_query', async (query) => {
      const chatId = query.message?.chat.id;
      if (!chatId || !(await this.isAdminChat(chatId)) || !query.data) {
        await this.bot?.answerCallbackQuery(query.id, { text: 'Ruxsat yo‘q' });
        return;
      }

      const [type, idOrSource, value] = query.data.split(':');
      try {
        if (type === 'status') {
          const order = await this.orderModel.findById(idOrSource).exec();
          if (!order) throw new Error('Order not found');
          order.status = value as OrderStatus;
          if (order.status === 'ready') order.isTelegramNotified = true;
          await order.save();
          await this.bot?.answerCallbackQuery(query.id, { text: 'Status yangilandi' });
          await this.bot?.sendMessage(chatId, `${order.customerName} buyurtmasi statusi: ${this.orderStatusLabel(order.status)}`);
          await this.sendOrderStatusChanged(order.telegramPhone || order.phone, order.status, this.orderTelegramDetails(order));
        }

        if (type === 'debt') {
          const source = idOrSource as AdminDebtSource;
          if (source === 'flower') {
            const order = await this.orderModel.findById(value).exec();
            if (!order) throw new Error('Order not found');
            await this.sendDebtReminder(order.telegramPhone || order.phone, this.orderTelegramDetails(order));
          } else {
            const sale = await this.saleModel.findById(value).exec();
            if (!sale) throw new Error('Sale not found');
            await this.sendSaleDebtReminder(sale.phone, this.saleTelegramDetails(sale));
          }
          await this.bot?.answerCallbackQuery(query.id, { text: 'Eslatma yuborildi' });
        }
      } catch {
        await this.bot?.answerCallbackQuery(query.id, { text: 'Amal bajarilmadi' });
      }
    });

    this.bot.onText(/^Buyurtma holatini tekshirish$/i, async (msg) => {
      const user = await this.telegramUserModel.findOne({ chatId: String(msg.chat.id) }).exec();
      if (!user?.phone) {
        await this.bot?.sendMessage(msg.chat.id, 'Buyurtma holatini tekshirish uchun avval telefon raqamingizni yuboring.', {
          reply_markup: {
            keyboard: [[{ text: 'Telefon raqamni yuborish', request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });
        return;
      }

      const orders = await this.orderModel
        .find({ $or: [{ phone: user.phone }, { telegramPhone: user.phone }] })
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(5)
        .exec();

      if (orders.length === 0) {
        await this.bot?.sendMessage(msg.chat.id, 'Hozircha sizga bog‘langan buyurtma topilmadi.');
        return;
      }

      const message = [
        await this.settingsService.getStoreName(),
        '',
        'Buyurtmalaringiz holati:',
        '',
        orders
          .map((order, index) =>
            [
              `${index + 1}. ${order.orderText}`,
              `Status: ${this.orderStatusLabel(order.status)}`,
              `Olib ketish vaqti: ${this.formatDate(order.pickupDate)}`,
              `Umumiy summa: ${this.formatMoney(order.totalAmount)}`,
              `Qolgan qarz: ${this.formatMoney(order.debtAmount)}`,
            ].join('\n'),
          )
          .join('\n\n'),
      ].join('\n');

      await this.bot?.sendMessage(msg.chat.id, message);
    });

    this.bot.onText(/\/start/, async (msg) => {
      if (await this.isAdminChat(msg.chat.id)) {
        await this.sendAdminMenu(msg.chat.id);
        return;
      }
      this.bot?.sendMessage(msg.chat.id, `${await this.settingsService.getStoreName()} botiga xush kelibsiz. Telefon raqamingizni yuboring.`, {
        reply_markup: {
          keyboard: [[{ text: 'Telefon raqamni yuborish', request_contact: true }], [{ text: 'Buyurtma holatini tekshirish' }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
    });

    this.bot.on('contact', async (msg) => {
      if (!msg.contact?.phone_number) return;
      const phone = normalizePhone(msg.contact.phone_number);
      await this.telegramUserModel.findOneAndUpdate(
        { chatId: String(msg.chat.id) },
        { chatId: String(msg.chat.id), phone, firstName: msg.from?.first_name, username: msg.from?.username },
        { upsert: true, new: true },
      );
      await this.bot?.sendMessage(msg.chat.id, 'Rahmat! Endi buyurtma va xarid xabarlarini shu yerda olasiz.', {
        reply_markup: {
          keyboard: [[{ text: 'Buyurtma holatini tekshirish' }]],
          resize_keyboard: true,
        },
      });
    });
  }

  private formatDate(value: Date) {
    const date = new Date(value);
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private formatMoney(value: number) {
    return `${Number(value || 0).toLocaleString('uz-UZ')} so'm`;
  }

  private paymentTypeLabel(value: PaymentType) {
    const labels: Record<PaymentType, string> = {
      cash: 'Naqd',
      card: 'Karta',
      click: 'Click',
      payme: 'Payme',
      debt: 'Nasiya',
    };
    return labels[value] || value;
  }

  private orderStatusLabel(status: OrderStatus) {
    const labels: Record<OrderStatus, string> = {
      new: 'Yangi',
      in_progress: 'Jarayonda',
      ready: 'Tayyor',
      picked_up: 'Olib ketildi',
      cancelled: 'Bekor qilindi',
    };
    return labels[status] || status;
  }

  private statusMessage(status: OrderStatus) {
    const messages: Record<OrderStatus, string> = {
      new: 'Buyurtma holati yangilandi.',
      in_progress: 'Buyurtmangiz tayyorlanmoqda.',
      ready: 'Buyurtmangiz tayyor bo‘ldi.',
      picked_up: 'Buyurtmangiz olib ketildi. Xaridingiz uchun rahmat!',
      cancelled: 'Buyurtmangiz bekor qilindi.',
    };
    return messages[status] || 'Buyurtma holati yangilandi.';
  }

  private orderDetailsBlock(details: OrderTelegramDetails) {
    return [
      `Buyurtma: ${details.orderText}`,
      `Olib ketish vaqti: ${this.formatDate(details.pickupDate)}`,
      `Umumiy summa: ${this.formatMoney(details.totalAmount)}`,
      `Oldindan to'lov: ${this.formatMoney(details.prepaidAmount)}`,
      `Qolgan qarz: ${this.formatMoney(details.debtAmount)}`,
      details.note ? `Izoh: ${details.note}` : undefined,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private orderTelegramDetails(order: OrderDocument): OrderTelegramDetails {
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

  private saleTelegramDetails(sale: SaleDocument): SaleTelegramDetails {
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

  private orderDebtReminderBlock(details: OrderTelegramDetails) {
    return [
      `Buyurtma: ${details.orderText}`,
      `Qolgan qarz: ${this.formatMoney(details.debtAmount)}`,
      'Iltimos, qolgan qarzni bartaraf eting.',
    ].join('\n');
  }

  private saleDetailsBlock(details: SaleTelegramDetails) {
    return [
      `Tovar: ${details.productName || 'Sovga/tovar'}`,
      `Umumiy summa: ${this.formatMoney(details.amount)}`,
      `To'langan: ${this.formatMoney(details.paidAmount)}`,
      `Qolgan qarz: ${this.formatMoney(details.debtAmount)}`,
      `To'lov turi: ${this.paymentTypeLabel(details.paymentType)}`,
      details.note ? `Izoh: ${details.note}` : undefined,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private saleDebtMessage(details: SaleTelegramDetails, intro: string, storeName: string) {
    return [
      storeName,
      '',
      `Assalomu alaykum${details.customerName ? `, ${details.customerName}` : ''}!`,
      intro,
      '',
      `Tovar: ${details.productName || 'Sovga/tovar'}`,
      `Qolgan qarz: ${this.formatMoney(details.debtAmount)}`,
      'Iltimos, qolgan qarzni bartaraf eting.',
      '',
      'Rahmat!',
    ].join('\n');
  }
}
