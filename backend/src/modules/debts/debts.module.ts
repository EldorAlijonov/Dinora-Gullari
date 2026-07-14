import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Sale, SaleSchema } from '../sales/schemas/sale.schema';
import { DebtsController } from './debts.controller';
import { DebtsService } from './debts.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }, { name: Sale.name, schema: SaleSchema }])],
  controllers: [DebtsController],
  providers: [DebtsService],
  exports: [DebtsService, MongooseModule],
})
export class DebtsModule {}
