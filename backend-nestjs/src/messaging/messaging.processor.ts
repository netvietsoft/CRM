import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MESSAGE_DISPATCH_JOB, MESSAGE_DISPATCH_QUEUE } from './messaging.constants';
import { MessagingService } from './messaging.service';
import { MessageDispatchJobData } from './messaging.types';

@Processor(MESSAGE_DISPATCH_QUEUE)
export class MessagingProcessor extends WorkerHost {
  private readonly logger = new Logger(MessagingProcessor.name);

  constructor(private readonly messagingService: MessagingService) {
    super();
  }

  async process(job: Job<MessageDispatchJobData>): Promise<any> {
    if (job.name !== MESSAGE_DISPATCH_JOB) {
      this.logger.warn(`Unknown job type ${job.name}`);
      return null;
    }

    return this.messagingService.processDispatchJob(
      job.data,
      job.attemptsMade + 1,
      typeof job.opts.attempts === 'number' ? job.opts.attempts : 1,
    );
  }
}
