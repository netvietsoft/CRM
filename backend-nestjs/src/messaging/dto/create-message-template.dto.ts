import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageChannelCode, MessageTemplateKind } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateMessageTemplateDto {
  @ApiProperty({ enum: MessageChannelCode })
  @IsEnum(MessageChannelCode)
  channelCode: MessageChannelCode;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: MessageTemplateKind, default: MessageTemplateKind.CUSTOM })
  @IsOptional()
  @IsEnum(MessageTemplateKind)
  kind?: MessageTemplateKind;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storeId?: string;
}
