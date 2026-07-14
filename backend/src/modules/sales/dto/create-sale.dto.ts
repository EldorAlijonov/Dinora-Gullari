import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentType } from '../schemas/sale.schema';

export class CreateSaleDto {
  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  telegramPhone?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  paidAmount: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsEnum(['cash', 'card', 'click', 'payme'])
  paymentType: PaymentType;

  @IsOptional()
  @IsString()
  note?: string;
}
