import { Type } from 'class-transformer';
import { IsEnum, IsNumber, Min } from 'class-validator';
import { SaleDebtPaymentType } from '../schemas/sale.schema';

export class PaySaleDebtDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount: number;

  @IsEnum(['cash', 'card', 'click', 'payme'])
  paymentType: SaleDebtPaymentType;
}
