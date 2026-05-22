import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MessagingAdminService } from './messaging-admin.service';

@Injectable()
export class MessagingSchedulerService {
  private readonly logger = new Logger(MessagingSchedulerService.name);

  constructor(private readonly messagingAdminService: MessagingAdminService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processDueSchedules() {
    try {
      const result = await this.messagingAdminService.processDueSchedules();
      if (result.processed > 0) {
        this.logger.log(`Processed ${result.processed} messaging schedules`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to process messaging schedules: ${error.message}`);
    }
  }
}
