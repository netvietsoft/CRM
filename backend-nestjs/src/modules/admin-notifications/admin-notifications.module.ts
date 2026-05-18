import { Module } from '@nestjs/common';
import { AdminNotificationsService } from './admin-notifications.service';
import { AdminNotificationsController } from './admin-notifications.controller';
import { AdminNotificationsGateway } from './admin-notifications.gateway';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminNotificationsController],
  providers: [AdminNotificationsService, AdminNotificationsGateway],
  exports: [AdminNotificationsService], // Export so other modules (Webhooks, Users) can use it
})
export class AdminNotificationsModule {}
