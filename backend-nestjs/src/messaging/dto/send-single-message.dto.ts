import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageChannelCode, MessagePurpose } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class SendSingleMessageDto {
  @ApiProperty({ enum: MessageChannelCode })
  @IsEnum(MessageChannelCode)
  channelCode: MessageChannelCode;

  @ApiProperty()
  @IsString()
  recipient: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recipientName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderId?: string;

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

  @ApiPropertyOptional({ enum: MessagePurpose, default: MessagePurpose.TRANSACTIONAL })
  @IsOptional()
  @IsEnum(MessagePurpose)
  purpose?: MessagePurpose;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  templateVariables?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
