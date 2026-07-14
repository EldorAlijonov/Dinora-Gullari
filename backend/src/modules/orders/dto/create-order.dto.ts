import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../schemas/order.schema';

export class CreateOrderDto {
  @IsString()
  customerName: string;

  @IsString()
  phone: string;

  @IsString()
  telegramPhone: string;

  @IsString()
  orderText: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  prepaidAmount: number;

  @IsDateString()
  pickupDate: string;

  @IsOptional()
  @IsEnum(['new', 'in_progress', 'ready', 'picked_up', 'cancelled'])
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
