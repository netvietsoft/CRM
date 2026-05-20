import { Module } from '@nestjs/common';
import { AdminNotificationsModule } from '../modules/admin-notifications/admin-notifications.module';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({
  imports: [AdminNotificationsModule],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
