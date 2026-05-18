import { Module, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CassoController } from './casso.controller';
import { CassoService } from './casso.service';
import { OrdersModule } from '../orders/orders.module';
import { CommissionsModule } from '../commissions/commissions.module';
import { AdminNotificationsModule } from '../modules/admin-notifications/admin-notifications.module';
import { IntegrationsModule } from '../integrations/integrations.module';

const logger = new Logger('WebhooksModule');

// Helper function to conditionally load queue modules
function getQueueImports(): any[] {
  const redisHost = process.env.REDIS_HOST;
  const redisUrl = process.env.REDIS_URL;
  
  // Skip queue registration if Redis is not configured
  if (!redisHost && !redisUrl) {
    logger.warn('⚠️  Redis not configured - Webhook queue disabled');
    return [];
  }

  return [
    BullModule.registerQueue({
      name: 'voucher-queue',
    }),
  ];
}

@Module({
  imports: [
    PrismaModule,
    OrdersModule,
    CommissionsModule,
    AdminNotificationsModule,
    IntegrationsModule,
    ...getQueueImports(), // Conditionally load queue modules
  ],
  controllers: [WebhooksController, CassoController],
  providers: [WebhooksService, CassoService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
