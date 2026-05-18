import { IsString, IsNumber, IsOptional, IsObject, IsBoolean, IsArray } from 'class-validator';

export class ViettelPostWebhookDataDto {
  @IsString()
  ORDER_NUMBER: string;

  @IsNumber()
  ORDER_STATUS: number;

  @IsString()
  @IsOptional()
  STATUS_NAME?: string;

  @IsString()
  @IsOptional()
  ORDER_REFERENCE?: string;

  @IsString()
  @IsOptional()
  ORDER_STATUSDATE?: string;

  @IsString()
  @IsOptional()
  LOCALION_CURRENTLY?: string;

  @IsString()
  @IsOptional()
  LOCATION_CURRENTLY?: string;

  @IsString()
  @IsOptional()
  NOTE?: string;

  @IsNumber()
  @IsOptional()
  MONEY_COLLECTION?: number;

  @IsNumber()
  @IsOptional()
  MONEY_TOTAL?: number;

  @IsNumber()
  @IsOptional()
  PRODUCT_WEIGHT?: number;

  @IsString()
  @IsOptional()
  ORDER_SERVICE?: string;

  @IsString()
  @IsOptional()
  RECEIVER_FULLNAME?: string;

  @IsBoolean()
  @IsOptional()
  IS_RETURNING?: boolean;

  @IsArray()
  @IsOptional()
  DETAIL?: any[];

  @IsObject()
  @IsOptional()
  POD?: any;

  // Allow other fields without failing validation
  [key: string]: any;
}

export class ViettelPostWebhookDto {
  @IsObject()
  DATA: ViettelPostWebhookDataDto;

  @IsString()
  @IsOptional()
  TOKEN?: string;
}
