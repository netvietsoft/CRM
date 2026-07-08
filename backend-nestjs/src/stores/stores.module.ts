import { Module } from '@nestjs/common';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { MailModule } from '../mail/mail.module';
import { AdminNotificationsModule } from '../modules/admin-notifications/admin-notifications.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [MailModule, AdminNotificationsModule, UploadModule],
  controllers: [StoresController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}
