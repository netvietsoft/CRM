import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUnitDto {
  @ApiProperty({ example: 'Cái' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'CAI' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
