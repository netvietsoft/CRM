import { IsString, IsEmail, IsOptional, IsArray, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStaffDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false, description: 'Tên đăng nhập — đăng nhập được bằng username này' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  phone: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  storeId?: string;

  @ApiProperty({ required: false, description: 'Ảnh đại diện NV — hiển thị khi được phân công hội thoại' })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsOptional()
  permissions?: string[];
}
