import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DebtListItem, DebtsService } from './debts.service';

@Controller('debts')
@UseGuards(JwtAuthGuard)
export class DebtsController {
  constructor(private readonly debtsService: DebtsService) {}

  @Get()
  findAll(@Query() query: { status?: 'active' | 'paid'; search?: string; source?: 'all' | 'flower' | 'gift' }): Promise<DebtListItem[]> {
    return this.debtsService.findAll(query);
  }

  @Get('stats')
  stats() {
    return this.debtsService.stats();
  }
}
