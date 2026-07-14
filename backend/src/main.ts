import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import compression = require('compression');
import { json, urlencoded } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { MonitoringService } from './modules/monitoring/monitoring.service';

function parseOrigins(value?: string) {
  return (value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const bodyLimit = config.get<string>('REQUEST_BODY_LIMIT') || '10mb';
  const allowedOrigins = parseOrigins(config.get<string>('CLIENT_URLS') || config.get<string>('CLIENT_URL') || 'http://localhost:5173');

  app.use(helmet());
  app.use(compression());
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));
  app.use(
    rateLimit({
      windowMs: Number(config.get<string>('RATE_LIMIT_WINDOW_MS') || 60_000),
      max: Number(config.get<string>('RATE_LIMIT_MAX') || 180),
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter(app.get(MonitoringService)));
  await app.listen(Number(config.get<string>('PORT') || 5000));
}

void bootstrap();
