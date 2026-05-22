import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageChannelCode } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { AudienceFilterDto, RecipientSourceType } from './send-filtered-campaign.dto';

export class PreviewAudienceDto {
  @ApiProperty({ enum: MessageChannelCode })
  @IsEnum(MessageChannelCode)
  channelCode: MessageChannelCode;

  @ApiProperty({ enum: RecipientSourceType })
  @IsEnum(RecipientSourceType)
  source: RecipientSourceType;

  @ApiPropertyOptional({ type: AudienceFilterDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AudienceFilterDto)
  filters?: AudienceFilterDto;
}
