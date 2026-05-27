import { Module, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import type { RegisterQueueOptions } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { MESSAGE_DEAD_LETTER_QUEUE, MESSAGE_DISPATCH_QUEUE } from './messaging.constants';
import { PrismaModule } from '../prisma/prisma.module';
import { SmsModule } from '../integrations/sms/sms.module';
import { MessagingService } from './messaging.service';
import { MessagingProcessor } from './messaging.processor';
import { MessagingProviderRegistryService } from './messaging-provider-registry.service';
import { MessagingRendererService } from './messaging-renderer.service';
import { MessagingValidatorService } from './messaging-validator.service';
import { SmsMessagingProvider } from './providers/sms-messaging.provider';
import { MessagingAdminController } from './messaging-admin.controller';
import { MessagingAdminService } from './messaging-admin.service';
import { MessagingSchedulerService } from './messaging-scheduler.service';
import { MessagingAudienceService } from './messaging-audience.service';
import { MessagingAutomationService } from './messaging-automation.service';

const logger = new Logger('MessagingModule');

function getQueueImports(): any[] {
  const redisHost = process.env.REDIS_HOST;
  const redisUrl = process.env.REDIS_URL;

  if (!redisHost && !redisUrl) {
    logger.warn('⚠️  Redis not configured - messaging queue disabled');
    return [];
  }

  const attempts = Number(process.env.MESSAGING_QUEUE_ATTEMPTS || 3);
  const backoffDelay = Number(process.env.MESSAGING_QUEUE_BACKOFF_MS || 5000);
  const dispatchQueueOptions: RegisterQueueOptions = {
    name: MESSAGE_DISPATCH_QUEUE,
    defaultJobOptions: {
      attempts,
      backoff: {
        type: 'exponential',
        delay: backoffDelay,
      },
      removeOnComplete: {
        age: 86400,
        count: 1000,
      },
      removeOnFail: {
        age: 604800,
      },
    },
  };
  const deadLetterQueueOptions: RegisterQueueOptions = {
    name: MESSAGE_DEAD_LETTER_QUEUE,
    defaultJobOptions: {
      removeOnComplete: false,
      removeOnFail: false,
    },
  };

  return [
    BullModule.registerQueue(dispatchQueueOptions, deadLetterQueueOptions),
    BullBoardModule.forFeature({
      name: MESSAGE_DISPATCH_QUEUE,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: MESSAGE_DEAD_LETTER_QUEUE,
      adapter: BullMQAdapter,
    }),
  ];
}

function getProviders(): any[] {
  const redisHost = process.env.REDIS_HOST;
  const redisUrl = process.env.REDIS_URL;

  const providers: any[] = [
    MessagingService,
    MessagingAudienceService,
    MessagingAutomationService,
    MessagingAdminService,
    MessagingProviderRegistryService,
    MessagingRendererService,
    MessagingValidatorService,
    SmsMessagingProvider,
    MessagingSchedulerService,
  ];

  if (redisHost || redisUrl) {
    providers.push(MessagingProcessor);
  }

  return providers;
}

@Module({
  imports: [PrismaModule, SmsModule, ...getQueueImports()],
  controllers: [MessagingAdminController],
  providers: getProviders(),
  exports: [MessagingService, MessagingAdminService, MessagingAutomationService],
})
export class MessagingModule {}
