import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProductTagDto {
  @ApiProperty({ example: 'Hàng mới' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'hang-moi' })
  @IsOptional()
  @IsString()
  slug?: string;
}
