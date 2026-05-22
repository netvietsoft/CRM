import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class UpdateMessageScheduleDto {
  @ApiProperty()
  @IsDateString()
  runAt: string;
}
