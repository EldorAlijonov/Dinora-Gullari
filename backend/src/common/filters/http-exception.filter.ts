import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MonitoringService } from '../../modules/monitoring/monitoring.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly monitoring?: MonitoringService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : 'Internal server error';
    const requestId = randomUUID();
    const message = typeof body === 'string' ? body : (body as Record<string, unknown>).message;

    void this.monitoring?.recordHttpError({
      requestId,
      status,
      message,
      exception,
      request,
    });

    response.status(status).json({
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId,
      message,
    });
  }
}
