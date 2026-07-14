import { Module } from '@nestjs/common';
import { TelegramModule } from '../telegram/telegram.module';
import { MonitoringService } from './monitoring.service';

@Module({
  imports: [TelegramModule],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
