import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AdminOrderItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Manual unit price override for admin-created orders' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

export class CreateAdminOrderDto {
  @ApiPropertyOptional({ description: 'User ID - optional for guest orders' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ type: [AdminOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminOrderItemDto)
  items: AdminOrderItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shippingName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shippingPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional({ enum: ['MALE', 'FEMALE', 'OTHER'] })
  @IsOptional()
  @IsIn(['MALE', 'FEMALE', 'OTHER'])
  customerGender?: 'MALE' | 'FEMALE' | 'OTHER';

  @ApiPropertyOptional({ example: '1995-01-01' })
  @IsOptional()
  @IsDateString()
  customerDob?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shippingStreet?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shippingWard?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shippingProvince?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerNote?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminNote?: string;

  @ApiPropertyOptional({ default: 'COD' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  shippingFee?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Initial order status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Additional metadata (staff assignments, carrier, etc.)' })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: "Nguồn đơn — chỉ nhận 'CCM' (trang Đơn hàng CCM); khác/thiếu → ADMIN_MANUAL" })
  @IsOptional()
  @IsString()
  source?: string;
}
