import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MetaAdsClient } from './meta/meta-ads.client';
import { MetaAdsConnector } from './meta/meta-ads.connector';
import { AdsSyncService } from './ads-sync.service';
import { AdsService } from './ads.service';
import { AdsController } from './ads.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AdsController],
  providers: [MetaAdsClient, MetaAdsConnector, AdsSyncService, AdsService],
  exports: [AdsSyncService, AdsService],
})
export class AdsModule {}
