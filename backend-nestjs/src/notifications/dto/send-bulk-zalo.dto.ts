import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendBulkZaloDto {
  @ApiProperty({ description: 'List of User IDs to send messages to' })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  userIds: string[];

  @ApiProperty({ description: 'The ID of the NotificationTemplate record' })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({ description: 'Data map to fill in the template parameters' })
  @IsObject()
  @IsOptional()
  templateData?: Record<string, string>;
}
