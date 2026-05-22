import { ApiPropertyOptional } from '@nestjs/swagger';
import { MessageChannelCode, MessageScheduleStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString, Min } from 'class-validator';

export class ListMessageSchedulesDto {
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

  @ApiPropertyOptional({ enum: MessageScheduleStatus })
  @IsOptional()
  @IsEnum(MessageScheduleStatus)
  status?: MessageScheduleStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  runFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  runTo?: string;
}
