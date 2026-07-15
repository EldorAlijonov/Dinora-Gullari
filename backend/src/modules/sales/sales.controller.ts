import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BulkDeleteDto } from '../../common/dto/bulk-delete.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { CreateSaleDto } from './dto/create-sale.dto';
import { PaySaleDebtDto } from './dto/pay-sale-debt.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { SalesService } from './sales.service';
import { PaymentType } from './schemas/sale.schema';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  findAll(@Query() query: { paymentType?: PaymentType; date?: string; dateFrom?: string; dateTo?: string; search?: string; page?: string; limit?: string }) {
    return this.salesService.findAll(query);
  }

  @Post()
  create(@Body() dto: CreateSaleDto, @CurrentUser() user: { userId: string }) {
    return this.salesService.create(dto, user.userId);
  }

  @Patch(':id')
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateSaleDto) {
    return this.salesService.update(id, dto);
  }

  @Post(':id/pay-debt')
  payDebt(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: PaySaleDebtDto, @CurrentUser() user: { userId: string }) {
    return this.salesService.payDebt(id, dto, user.userId);
  }

  @Post(':id/send-debt-reminder')
  sendDebtReminder(@Param('id', ParseObjectIdPipe) id: string) {
    return this.salesService.sendDebtReminder(id);
  }

  @Delete('bulk')
  bulkRemove(@Body() dto: BulkDeleteDto, @CurrentUser() user: { userId: string }) {
    return this.salesService.bulkRemove(dto, user.userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: { userId: string }) {
    return this.salesService.remove(id, user.userId);
  }
}
