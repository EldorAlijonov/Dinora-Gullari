import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GoogleSheetsService } from './google-sheets.service';

@Controller('google-sheets')
@UseGuards(JwtAuthGuard)
export class GoogleSheetsController {
  constructor(private readonly googleSheetsService: GoogleSheetsService) {}

  @Post('test')
  testConnection() {
    return this.googleSheetsService.testConnection();
  }
}
