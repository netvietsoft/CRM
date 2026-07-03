import { PartialType } from '@nestjs/swagger';
import { CreateOrderSourceDto } from './create-order-source.dto';

export class UpdateOrderSourceDto extends PartialType(CreateOrderSourceDto) {}
