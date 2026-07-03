import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderSourceDto {
  @ApiProperty({ example: 'VIETTEL' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Viettel' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'integration', description: 'manual | integration' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: '#2563eb' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
