import { Module, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { PrismaModule } from '../../prisma/prisma.module';
import { ADS_SYNC_QUEUE } from './ads.constants';
import { MetaAdsClient } from './meta/meta-ads.client';
import { MetaAdsConnector } from './meta/meta-ads.connector';
import { AdsSyncService } from './ads-sync.service';
import { AdsSyncProcessor } from './ads-sync.processor';
import { AdsService } from './ads.service';
import { AdsController } from './ads.controller';

const logger = new Logger('AdsModule');

// Có Redis → bật queue + processor; trống → đồng bộ chạy inline (fallback).
const redisEnabled = !!(process.env.REDIS_HOST || process.env.REDIS_URL);

function getQueueImports(): any[] {
  if (!redisEnabled) {
    logger.warn('⚠️  Redis not configured - ads sync queue disabled (chạy inline khi bấm Đồng bộ).');
    return [];
  }
  return [
    BullModule.registerQueue({
      name: ADS_SYNC_QUEUE,
      defaultJobOptions: { removeOnComplete: true, removeOnFail: 50 },
    }),
    BullBoardModule.forFeature({ name: ADS_SYNC_QUEUE, adapter: BullMQAdapter }),
  ];
}

function getProviders(): any[] {
  const providers: any[] = [MetaAdsClient, MetaAdsConnector, AdsSyncService, AdsService];
  if (redisEnabled) providers.push(AdsSyncProcessor);
  return providers;
}

@Module({
  imports: [PrismaModule, ...getQueueImports()],
  controllers: [AdsController],
  providers: getProviders(),
  exports: [AdsSyncService, AdsService],
})
export class AdsModule {}
