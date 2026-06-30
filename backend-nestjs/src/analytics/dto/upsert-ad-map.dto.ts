import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertAdMapDto {
  @ApiPropertyOptional({ default: 'META' })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ default: 'campaign' })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiProperty({ description: 'externalId của campaign (AdCampaign.externalId)' })
  @IsString()
  @IsNotEmpty()
  adEntityExternalId: string;

  @ApiProperty({ nullable: true, description: 'productId; null = gỡ map' })
  @ValidateIf((o) => o.productId !== null && o.productId !== undefined)
  @IsString()
  productId: string | null;
}
