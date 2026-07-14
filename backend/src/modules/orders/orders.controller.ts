import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { CreateOrderDto } from './dto/create-order.dto';
import { PayOrderDebtDto } from './dto/pay-order-debt.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersService } from './orders.service';
import { OrderStatus } from './schemas/order.schema';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@Query() query: { status?: OrderStatus; search?: string; date?: string; dateFrom?: string; dateTo?: string; page?: string; limit?: string; filter?: 'today' | 'pickup_today' | 'upcoming' | 'debt' | 'overdue' }) {
    return this.ordersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: { userId: string }) {
    return this.ordersService.create(dto, user.userId);
  }

  @Patch(':id')
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }

  @Post(':id/pay-debt')
  payDebt(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: PayOrderDebtDto, @CurrentUser() user: { userId: string }) {
    return this.ordersService.payDebt(id, dto, user.userId);
  }

  @Post(':id/send-debt-reminder')
  sendDebtReminder(@Param('id', ParseObjectIdPipe) id: string) {
    return this.ordersService.sendDebtReminder(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: { userId: string }) {
    return this.ordersService.remove(id, user.userId);
  }
}
