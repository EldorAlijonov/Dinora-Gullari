import { IsEnum } from 'class-validator';
import { OrderStatus } from '../schemas/order.schema';

export class UpdateOrderStatusDto {
  @IsEnum(['new', 'in_progress', 'ready', 'picked_up', 'cancelled'])
  status: OrderStatus;
}
