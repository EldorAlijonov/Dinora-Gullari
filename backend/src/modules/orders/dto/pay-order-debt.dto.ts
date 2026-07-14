import { Type } from 'class-transformer';
import { IsEnum, IsNumber, Min } from 'class-validator';

export class PayOrderDebtDto {
  @Type(() => Number)
  @IsNumber({}, { message: 'To‘lov miqdori 0 dan katta bo‘lishi kerak' })
  @Min(1, { message: 'To‘lov miqdori 0 dan katta bo‘lishi kerak' })
  amount: number;

  @IsEnum(['cash', 'card', 'click', 'payme'])
  paymentType: 'cash' | 'card' | 'click' | 'payme';
}
