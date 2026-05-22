import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SmsService } from './sms.service';

@Module({
  imports: [PrismaModule],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
