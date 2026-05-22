import { ApiPropertyOptional } from '@nestjs/swagger';
import { MessageCampaignStatus, MessageChannelCode } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Min } from 'class-validator';

export class ListMessageCampaignsDto {
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

  @ApiPropertyOptional({ enum: MessageCampaignStatus })
  @IsOptional()
  @IsEnum(MessageCampaignStatus)
  status?: MessageCampaignStatus;
}
