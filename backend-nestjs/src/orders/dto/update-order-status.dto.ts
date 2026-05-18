import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrderStatusDto {
  @ApiPropertyOptional({
    enum: [
      'PENDING',
      'WAITING_FOR_GOODS',
      'CONFIRMED',
      'PACKAGING',
      'WAITING_FOR_SHIPPING',
      'SHIPPED',
      'DELIVERED',
      'PAYMENT_COLLECTED',
      'RETURNING',
      'EXCHANGING',
      'COMPLETED',
      'CANCELLED',
      'REFUNDED',
    ],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    enum: ['UNPAID', 'PAID', 'PARTIALLY_PAID', 'REFUNDED'],
  })
  @IsOptional()
  @IsString()
  paymentStatus?: string;
}
