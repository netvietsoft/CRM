import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class ClaimQRVoucherDto {
  @IsString()
  @IsNotEmpty()
  orderCode: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsUUID()
  @IsOptional()
  voucherId?: string;

  @IsString()
  @IsNotEmpty()
  otp: string;
}
