import { Module, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { ZaloTokenService } from './zalo-token.service';
import { ZbsTemplateService } from './zbs-template.service';
import { ZaloZnsProcessor } from './zalo-zns.processor';

const logger = new Logger('NotificationsModule');

function getQueueImports(): any[] {
  const redisHost = process.env.REDIS_HOST;
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisHost && !redisUrl) {
    logger.warn('⚠️  Redis not configured - Zalo ZNS queue disabled');
    return [];
  }

  return [
    BullModule.registerQueue({
      name: 'zalo-zns',
    }),
    BullBoardModule.forFeature({
      name: 'zalo-zns',
      adapter: BullMQAdapter,
    }),
  ];
}

function getProviders(): any[] {
  const redisHost = process.env.REDIS_HOST;
  const redisUrl = process.env.REDIS_URL;
  
  const providers: any[] = [
    NotificationsService,
    ZaloTokenService,
    ZbsTemplateService,
  ];
  
  if (redisHost || redisUrl) {
    providers.push(ZaloZnsProcessor);
  }
  
  return providers;
}

@Module({
  imports: [
    ...getQueueImports(),
  ],
  controllers: [NotificationsController],
  providers: getProviders(),
  exports: [NotificationsService, ZaloTokenService],
})
export class NotificationsModule {}
