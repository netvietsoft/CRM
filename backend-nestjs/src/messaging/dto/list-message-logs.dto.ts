import { ApiPropertyOptional } from '@nestjs/swagger';
import { MessageChannelCode, MessageLogStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Min } from 'class-validator';

export class ListMessageLogsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: MessageChannelCode })
  @IsOptional()
  @IsEnum(MessageChannelCode)
  channelCode?: MessageChannelCode;

  @ApiPropertyOptional({ enum: MessageLogStatus })
  @IsOptional()
  @IsEnum(MessageLogStatus)
  status?: MessageLogStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateTo?: string;
}
