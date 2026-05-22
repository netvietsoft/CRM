import { ApiPropertyOptional } from '@nestjs/swagger';
import { MessageAutomationExecutionStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, Min } from 'class-validator';

export class ListMessageAutomationExecutionsDto {
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

  @ApiPropertyOptional({ enum: MessageAutomationExecutionStatus })
  @IsOptional()
  @IsEnum(MessageAutomationExecutionStatus)
  status?: MessageAutomationExecutionStatus;
}
