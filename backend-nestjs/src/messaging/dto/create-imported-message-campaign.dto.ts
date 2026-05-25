import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageChannelCode, MessagePurpose } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ImportedMessageRecipientDto {
  @ApiProperty()
  @IsString()
  recipientValue: string;

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
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateImportedMessageCampaignDto {
  @ApiProperty({ enum: MessageChannelCode })
  @IsEnum(MessageChannelCode)
  channelCode: MessageChannelCode;

  @ApiProperty()
  @IsString()
  name: string;

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

  @ApiProperty({ type: [ImportedMessageRecipientDto] })
  @IsArray()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => ImportedMessageRecipientDto)
  recipients: ImportedMessageRecipientDto[];
}
