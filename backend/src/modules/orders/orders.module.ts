import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeletedRecord, DeletedRecordSchema } from '../backups/schemas/deleted-record.schema';
import { TelegramModule } from '../telegram/telegram.module';
import { Order, OrderSchema } from './schemas/order.schema';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: DeletedRecord.name, schema: DeletedRecordSchema },
    ]),
    TelegramModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService, MongooseModule],
})
export class OrdersModule {}
