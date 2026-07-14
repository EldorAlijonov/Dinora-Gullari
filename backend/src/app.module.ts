import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrdersModule } from './modules/orders/orders.module';
import { SalesModule } from './modules/sales/sales.module';
import { DebtsModule } from './modules/debts/debts.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SettingsModule } from './modules/settings/settings.module';
import { validateEnv } from './config/env.validation';
import { BackupsModule } from './modules/backups/backups.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    OrdersModule,
    SalesModule,
    DebtsModule,
    DashboardModule,
    ReportsModule,
    TelegramModule,
    NotificationsModule,
    SettingsModule,
    BackupsModule,
    MonitoringModule,
  ],
})
export class AppModule {}
