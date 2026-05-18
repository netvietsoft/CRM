import { IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateZbsTemplateDto {
  @ApiProperty({ description: 'Name of the template for management' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Title of the promotion (max 65 chars)' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Content of the promotion' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'Button label' })
  @IsString()
  @IsNotEmpty()
  buttonName: string;

  @ApiProperty({ description: 'Button target URL' })
  @IsString()
  @IsUrl()
  @IsNotEmpty()
  buttonUrl: string;
}
