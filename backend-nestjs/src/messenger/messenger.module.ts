import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminNotificationsModule } from '../modules/admin-notifications/admin-notifications.module';
import { MetaMessengerClient } from './meta-messenger.client';
import { MessengerService } from './messenger.service';
import { MessengerController } from './messenger.controller';
import { MessengerWebhookController } from './messenger-webhook.controller';

@Module({
  imports: [PrismaModule, AdminNotificationsModule],
  controllers: [MessengerController, MessengerWebhookController],
  providers: [MetaMessengerClient, MessengerService],
  exports: [MessengerService],
})
export class MessengerModule {}
