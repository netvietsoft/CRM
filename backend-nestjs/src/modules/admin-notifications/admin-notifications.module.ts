import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminNotificationsService } from './admin-notifications.service';
import { AdminNotificationsController } from './admin-notifications.controller';
import { AdminNotificationsGateway } from './admin-notifications.gateway';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, JwtModule.register({ secret: process.env.JWT_SECRET })],
  controllers: [AdminNotificationsController],
  providers: [AdminNotificationsService, AdminNotificationsGateway],
  exports: [AdminNotificationsService, AdminNotificationsGateway], // Export so other modules (Webhooks, Users, Messenger) can use it
})
export class AdminNotificationsModule {}
