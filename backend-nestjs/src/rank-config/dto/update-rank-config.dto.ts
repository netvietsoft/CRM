import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Rank } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateRankConfigDto {
  @ApiProperty({ enum: Rank })
  @IsEnum(Rank)
  rank!: Rank;

  @ApiProperty({ minimum: 0 })
  @IsNumber()
  @Min(0)
  minTotalSpent!: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrdersMonth?: number | null;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;
}
