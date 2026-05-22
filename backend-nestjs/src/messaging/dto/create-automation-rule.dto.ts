import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageAutomationTriggerType, MessageChannelCode } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateAutomationRuleDto {
  @ApiProperty({ enum: MessageChannelCode })
  @IsEnum(MessageChannelCode)
  channelCode: MessageChannelCode;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: MessageAutomationTriggerType })
  @IsEnum(MessageAutomationTriggerType)
  triggerType: MessageAutomationTriggerType;

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
  @IsObject()
  triggerConfig?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  audienceFilter?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
