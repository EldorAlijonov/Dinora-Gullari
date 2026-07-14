import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppSettings, SettingsSchema } from './schemas/settings.schema';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: AppSettings.name, schema: SettingsSchema }])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService, MongooseModule],
})
export class SettingsModule {}
