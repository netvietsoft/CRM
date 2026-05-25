import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageChannelCode, MessagePurpose, OrderStatus, PaymentStatus, Rank } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export enum RecipientSourceType {
  CUSTOMERS = 'CUSTOMERS',
  ORDERS = 'ORDERS',
}

export enum AudiencePurchaseState {
  PURCHASED_SUCCESS = 'PURCHASED_SUCCESS',
  PURCHASED_FAILED = 'PURCHASED_FAILED',
  NOT_PURCHASED = 'NOT_PURCHASED',
}

export class AudienceFilterDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  orderIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: Rank, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(Rank, { each: true })
  customerRanks?: Rank[];

  @ApiPropertyOptional({ enum: OrderStatus, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(OrderStatus, { each: true })
  orderStatuses?: OrderStatus[];

  @ApiPropertyOptional({ enum: PaymentStatus, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(PaymentStatus, { each: true })
  paymentStatuses?: PaymentStatus[];

  @ApiPropertyOptional({ enum: AudiencePurchaseState })
  @IsOptional()
  @IsEnum(AudiencePurchaseState)
  purchaseState?: AudiencePurchaseState;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  purchasedFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  purchasedTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  minOrderAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  maxOrderAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  minTotalSpent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  maxTotalSpent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  minOrderCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  maxOrderCount?: number;

  @ApiPropertyOptional({ default: 200 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number;
}

export class SendFilteredCampaignDto {
  @ApiProperty({ enum: MessageChannelCode })
  @IsEnum(MessageChannelCode)
  channelCode: MessageChannelCode;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: RecipientSourceType })
  @IsEnum(RecipientSourceType)
  source: RecipientSourceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerConfigId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  messageContent?: string;

  @ApiPropertyOptional({ enum: MessagePurpose, default: MessagePurpose.MARKETING })
  @IsOptional()
  @IsEnum(MessagePurpose)
  purpose?: MessagePurpose;

  @ApiPropertyOptional({ type: AudienceFilterDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AudienceFilterDto)
  filters?: AudienceFilterDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  templateVariables?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
