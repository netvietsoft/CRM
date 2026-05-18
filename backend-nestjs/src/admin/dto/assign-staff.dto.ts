import { IsString, IsArray, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Permission } from '../../auth/enums/permissions.enum';

export class AssignStaffDto {
  @ApiProperty({ description: 'The ID of the user to assign as staff' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'The ID of the store' })
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({
    description: 'List of permissions granted to the staff',
    enum: Permission,
    isArray: true,
  })
  @IsArray()
  @IsEnum(Permission, { each: true })
  @IsOptional()
  permissions?: Permission[];
}
