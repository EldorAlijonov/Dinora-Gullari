import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Sale, SaleSchema } from '../sales/schemas/sale.schema';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Sale.name, schema: SaleSchema }, { name: Order.name, schema: OrderSchema }])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
