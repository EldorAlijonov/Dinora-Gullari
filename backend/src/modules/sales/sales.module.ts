import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeletedRecord, DeletedRecordSchema } from '../backups/schemas/deleted-record.schema';
import { TelegramModule } from '../telegram/telegram.module';
import { SettingsModule } from '../settings/settings.module';
import { Sale, SaleSchema } from './schemas/sale.schema';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sale.name, schema: SaleSchema },
      { name: DeletedRecord.name, schema: DeletedRecordSchema },
    ]),
    TelegramModule,
    SettingsModule,
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService, MongooseModule],
})
export class SalesModule {}
