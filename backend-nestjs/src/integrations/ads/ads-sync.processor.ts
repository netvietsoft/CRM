import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ADS_SYNC_JOB, ADS_SYNC_QUEUE, AdsSyncJobData } from './ads.constants';
import { AdsSyncService } from './ads-sync.service';

@Processor(ADS_SYNC_QUEUE)
export class AdsSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(AdsSyncProcessor.name);

  constructor(private readonly syncService: AdsSyncService) {
    super();
  }

  async process(job: Job<AdsSyncJobData>): Promise<any> {
    if (job.name !== ADS_SYNC_JOB) {
      this.logger.warn(`Unknown job type ${job.name}`);
      return null;
    }
    const { days, effectiveStoreId } = job.data;
    return this.syncService.syncAll(days, effectiveStoreId);
  }
}
