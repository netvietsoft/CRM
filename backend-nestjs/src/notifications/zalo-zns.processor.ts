import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ZaloTokenService } from './zalo-token.service';
import axios from 'axios';

@Processor('zalo-zns')
export class ZaloZnsProcessor extends WorkerHost {
  private readonly logger = new Logger(ZaloZnsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly zaloTokenService: ZaloTokenService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}...`);
    
    const { notificationId, phone, templateId, templateData } = job.data;

    try {
      // 1. Format phone number to Zalo standard (84...)
      const formattedPhone = this.formatPhoneNumber(phone);

      // 2. Get Access Token
      const accessToken = await this.zaloTokenService.getAccessToken();
      if (!accessToken) {
        throw new Error('No Zalo access token available. Job will retry.');
      }

      // 3. Prepare ZBS Promotion request body
      const requestBody = {
        recipient: {
          phone: formattedPhone,
        },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'promotion',
              template_id: templateId,
              template_data: templateData || {},
            },
          },
        },
      };

      // 4. Send request to Zalo OpenAPI
      const response = await axios.post(
        'https://openapi.zalo.me/v3.0/oa/message/promotion',
        requestBody,
        {
          headers: {
            access_token: accessToken,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = response.data;

      // Check Zalo response
      if (data.error === 0) {
        // Success
        await this.prisma.notification.update({
          where: { id: notificationId },
          data: { 
            status: 'DELIVERED', 
            sentAt: new Date(),
            metadata: data as any,
          },
        });
        
        this.logger.log(`Job ${job.id}: Sent ZNS successfully to ${formattedPhone}`);
        return { success: true, messageId: data.data.message_id };
      } else {
        // Zalo API Error (e.g., rate limit, invalid template data)
        const errorMsg = `Zalo API Error ${data.error}: ${data.message}`;
        this.logger.warn(`Job ${job.id} failed: ${errorMsg}`);
        
        await this.prisma.notification.update({
          where: { id: notificationId },
          data: { 
            status: 'FAILED',
            error: errorMsg,
          },
        });
        
        // Throwing error will cause BullMQ to retry the job based on config
        throw new Error(errorMsg);
      }

    } catch (error: any) {
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      this.logger.error(`Job ${job.id} encountered error: ${errorMsg}`);

      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { 
          status: 'FAILED',
          error: errorMsg,
        },
      });

      throw error;
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Basic formatting: remove spaces, + sign, and leading 0, prepend 84
    let cleanPhone = phone.replace(/[\s+]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '84' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('84')) {
      // Assuming it's a Vietnamese number if it doesn't start with 0 or 84
      cleanPhone = '84' + cleanPhone;
    }
    return cleanPhone;
  }
}
