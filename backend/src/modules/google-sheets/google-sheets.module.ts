import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { GoogleSheetsController } from './google-sheets.controller';
import { GoogleSheetsService } from './google-sheets.service';

@Module({
  imports: [SettingsModule],
  controllers: [GoogleSheetsController],
  providers: [GoogleSheetsService],
  exports: [GoogleSheetsService],
})
export class GoogleSheetsModule {}
