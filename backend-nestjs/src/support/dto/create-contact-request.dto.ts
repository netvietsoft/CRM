import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateContactRequestDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  @MaxLength(180)
  email: string;

  @ApiProperty({ example: '0987654321' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone: string;

  @ApiProperty({ example: 'payment' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  subject: string;

  @ApiProperty({ example: 'Tôi đang gặp lỗi khi thanh toán VietQR.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  message: string;
}
