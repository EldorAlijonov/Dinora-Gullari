import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { GoogleSheetsService } from './google-sheets.service';

@Module({
  imports: [SettingsModule],
  providers: [GoogleSheetsService],
  exports: [GoogleSheetsService],
})
export class GoogleSheetsModule {}
