import { IsNumber, IsNotEmpty, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCommissionConfigDto {
  @ApiProperty({ example: 1, description: 'Commission level (1, 2, 3, etc.)' })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  level: number;

  @ApiProperty({ example: 10, description: 'Commission percentage (0-100)' })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Max(100)
  percentage: number;
}
