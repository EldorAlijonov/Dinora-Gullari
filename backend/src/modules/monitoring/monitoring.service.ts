import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, appendFile } from 'fs/promises';
import { join } from 'path';
import { Request } from 'express';
import { TelegramService } from '../telegram/telegram.service';

type ErrorContext = {
  requestId: string;
  status: number;
  message: unknown;
  exception: unknown;
  request: Request;
};

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private lastTelegramAlertAt = 0;

  constructor(
    private readonly config: ConfigService,
    private readonly telegramService: TelegramService,
  ) {}

  async recordHttpError(context: ErrorContext) {
    const entry = this.toLogEntry(context);
    const line = JSON.stringify(entry);

    if (context.status >= 500) {
      this.logger.error(line, context.exception instanceof Error ? context.exception.stack : undefined);
    } else {
      this.logger.warn(line);
    }

    await this.writeLog(line);

    if (context.status >= 500 && this.telegramAlertsEnabled()) {
      await this.notifyTelegram(entry, context.exception);
    }
  }

  private toLogEntry({ requestId, status, message, exception, request }: ErrorContext) {
    return {
      requestId,
      timestamp: new Date().toISOString(),
      status,
      method: request.method,
      path: request.originalUrl || request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      userId: (request.user as { userId?: string } | undefined)?.userId,
      message: this.normalizeMessage(message),
      errorName: exception instanceof Error ? exception.name : 'UnknownError',
    };
  }

  private normalizeMessage(message: unknown) {
    if (Array.isArray(message)) return message.join('; ');
    if (typeof message === 'string') return message;
    if (message && typeof message === 'object') return JSON.stringify(message);
    return 'Xatolik yuz berdi';
  }

  private async writeLog(line: string) {
    try {
      const logDir = this.config.get<string>('LOG_DIR') || join(process.cwd(), 'logs');
      await mkdir(logDir, { recursive: true });
      await appendFile(join(logDir, 'backend-errors.log'), `${line}\n`, 'utf8');
    } catch (error) {
      this.logger.warn(`Could not write backend error log: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  private telegramAlertsEnabled() {
    return this.config.get<string>('TELEGRAM_ERROR_ALERTS_ENABLED') !== 'false';
  }

  private async notifyTelegram(entry: ReturnType<MonitoringService['toLogEntry']>, exception: unknown) {
    const throttleMs = Number(this.config.get<string>('TELEGRAM_ERROR_ALERT_THROTTLE_MS') || 5 * 60 * 1000);
    const now = Date.now();
    if (now - this.lastTelegramAlertAt < throttleMs) return;
    this.lastTelegramAlertAt = now;

    const stack = exception instanceof Error ? exception.stack?.split('\n').slice(0, 3).join('\n') : '';
    await this.telegramService.notifyAdminsSystemError({
      ...entry,
      stack,
    });
  }
}
