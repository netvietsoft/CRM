import { Module, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { VouchersController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';
import { VoucherProcessor } from './voucher.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { SmsModule } from '../integrations/sms/sms.module';

const logger = new Logger('VouchersModule');

// Helper function to conditionally load queue modules
function getQueueImports(): any[] {
  const redisHost = process.env.REDIS_HOST;
  const redisUrl = process.env.REDIS_URL;
  
  // Skip queue registration if Redis is not configured
  if (!redisHost && !redisUrl) {
    logger.warn('⚠️  Redis not configured - Voucher queue disabled');
    return [];
  }

  return [
    BullModule.registerQueue({
      name: 'voucher-queue',
      // @ts-ignore

      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 86400, // Keep completed jobs for 24 hours
          count: 1000,
        },
        removeOnFail: {
          age: 604800, // Keep failed jobs for 7 days
        },
      },
    }),
    // Register queue with Bull Board Dashboard
    BullBoardModule.forFeature({
      name: 'voucher-queue',
      adapter: BullMQAdapter,
    }),
  ];
}

// Helper function to conditionally load providers
function getProviders(): any[] {
  const redisHost = process.env.REDIS_HOST;
  const redisUrl = process.env.REDIS_URL;
  
  const providers: any[] = [VouchersService];
  
  // Only add VoucherProcessor if Redis is configured
  if (redisHost || redisUrl) {
    providers.push(VoucherProcessor);
  }
  
  return providers;
}

@Module({
  imports: [
    PrismaModule,
    SmsModule,
    ...getQueueImports(), // Conditionally load queue modules
  ],
  controllers: [VouchersController],
  providers: getProviders(), // Conditionally load providers
  exports: [VouchersService],
})
export class VouchersModule {}
