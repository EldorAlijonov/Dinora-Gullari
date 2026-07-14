import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProfitGroupReport, ReportsOverview, ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily')
  daily(): Promise<ProfitGroupReport[]> {
    return this.reportsService.daily();
  }

  @Get('weekly')
  weekly(): Promise<ProfitGroupReport[]> {
    return this.reportsService.weekly();
  }

  @Get('monthly')
  monthly(): Promise<ProfitGroupReport[]> {
    return this.reportsService.monthly();
  }

  @Get('yearly')
  yearly(): Promise<ProfitGroupReport[]> {
    return this.reportsService.yearly();
  }

  @Get('overview')
  overview(): Promise<ReportsOverview> {
    return this.reportsService.overview();
  }
}
