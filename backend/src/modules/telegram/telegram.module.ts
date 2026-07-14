import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsModule } from '../notifications/notifications.module';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Sale, SaleSchema } from '../sales/schemas/sale.schema';
import { SettingsModule } from '../settings/settings.module';
import { TelegramUser, TelegramUserSchema } from './schemas/telegram-user.schema';
import { TelegramService } from './telegram.service';
import { TelegramUpdateService } from './telegram-update.service';

@Module({
  imports: [
    NotificationsModule,
    SettingsModule,
    MongooseModule.forFeature([
      { name: TelegramUser.name, schema: TelegramUserSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Sale.name, schema: SaleSchema },
    ]),
  ],
  providers: [TelegramService, TelegramUpdateService],
  exports: [TelegramService, MongooseModule],
})
export class TelegramModule {}
