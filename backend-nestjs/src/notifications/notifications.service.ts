import { Injectable, HttpException, HttpStatus, Optional, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SendBulkZaloDto } from './dto/send-bulk-zalo.dto';
import { SmsService } from '../integrations/sms/sms.service';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private readonly smsService: SmsService,
    @Optional() @Inject(getQueueToken('zalo-zns')) private readonly zaloQueue: Queue,
  ) {}

  async sendVoucherRewardZaloWithFallback(input: {
    userId: string;
    title: string;
    body: string;
    templateTypePrefix?: string;
    templateData?: Record<string, string>;
    fallbackSmsMessage: string;
    metadata?: Record<string, unknown>;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        phone: true,
      },
    });

    if (!user?.phone) {
      return {
        success: false,
        channel: 'NONE',
        reason: 'USER_PHONE_NOT_FOUND',
      };
    }

    const template = await this.prisma.notificationTemplate.findFirst({
      where: {
        channel: 'ZALO',
        zaloStatus: 'ENABLE',
        isActive: true,
        ...(input.templateTypePrefix
          ? {
              type: {
                startsWith: input.templateTypePrefix,
              },
            }
          : {}),
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (!template || !this.zaloQueue) {
      const smsResult = await this.smsService.sendMessage(user.phone, input.fallbackSmsMessage);
      return {
        success: smsResult.success,
        channel: 'SMS',
        reason: template ? 'ZALO_QUEUE_UNAVAILABLE' : 'ZALO_TEMPLATE_UNAVAILABLE',
        smsResult,
      };
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId: user.id,
        channel: 'ZALO',
        type: template.type,
        title: input.title,
        body: input.body,
        status: 'QUEUED',
        metadata: {
          ...(input.metadata || {}),
          templateData: input.templateData || {},
          fallbackSmsMessage: input.fallbackSmsMessage,
        } as any,
      },
    });

    try {
      await this.zaloQueue.add(
        'send-zns',
        {
          notificationId: notification.id,
          phone: user.phone,
          templateId: template.zaloTemplateId,
          templateData: input.templateData || {},
          fallbackSmsMessage: input.fallbackSmsMessage,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      );

      return {
        success: true,
        channel: 'ZALO',
        notificationId: notification.id,
      };
    } catch (error) {
      const smsResult = await this.smsService.sendMessage(user.phone, input.fallbackSmsMessage);
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: smsResult.success ? 'DELIVERED' : 'FAILED',
          error: smsResult.success ? 'ZALO_QUEUE_FAILED_SMS_FALLBACK_SENT' : 'ZALO_QUEUE_FAILED',
          metadata: {
            ...(input.metadata || {}),
            queueError: error instanceof Error ? error.message : String(error),
            fallbackSmsMessage: input.fallbackSmsMessage,
            smsFallbackSuccess: smsResult.success,
          } as any,
        },
      });

      return {
        success: smsResult.success,
        channel: 'SMS',
        reason: 'ZALO_QUEUE_ADD_FAILED',
        smsResult,
      };
    }
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [notifications, totalCount, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, status: 'QUEUED' } }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      unreadCount,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'DELIVERED' },
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, status: 'QUEUED' },
      data: { status: 'DELIVERED' },
    });
  }

  /**
   * Create a notification
   */
  async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type?: string;
    link?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        channel: 'EMAIL',
        type: data.type || 'INFO',
        title: data.title,
        body: data.message,
        metadata: data.link ? { link: data.link } : null,
        status: 'QUEUED',
      },
    });
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  /**
   * Send bulk Zalo messages by queueing them
   */
  async sendBulkZalo(dto: SendBulkZaloDto) {
    // 1. Validate template
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id: dto.templateId },
    });

    if (!template || template.channel !== 'ZALO' || template.zaloStatus !== 'ENABLE') {
      throw new HttpException(
        'Template không hợp lệ hoặc chưa được Zalo duyệt (ENABLE).',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 2. Fetch users and filter out those without phone numbers
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: dto.userIds },
        phone: { not: null },
      },
      select: { id: true, phone: true },
    });

    if (users.length === 0) {
      throw new HttpException(
        'Không có khách hàng nào có số điện thoại hợp lệ để gửi.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 3. Create Notification records
    const notifications = await Promise.all(
      users.map((user) =>
        this.prisma.notification.create({
          data: {
            userId: user.id,
            channel: 'ZALO',
            type: template.type,
            title: template.subject || template.name,
            body: template.body, // In a real scenario, you might replace placeholders here too
            status: 'QUEUED',
            metadata: dto.templateData as any,
          },
        }),
      ),
    );

    // 4. Enqueue jobs with delay to respect rate limits (e.g. 200ms per message = 5 msgs/sec)
    let delay = 0;
    const delayIncrement = 200; // ms

    const jobs = users.map((user, index) => {
      const jobData = {
        notificationId: notifications[index].id,
        phone: user.phone,
        templateId: template.zaloTemplateId,
        templateData: dto.templateData,
      };

      const currentDelay = delay;
      delay += delayIncrement;

      return {
        name: 'send-zns',
        data: jobData,
        opts: {
          delay: currentDelay,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      };
    });

    if (!this.zaloQueue) {
      throw new HttpException(
        'Zalo ZNS queue is not available (Redis not configured)',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    await this.zaloQueue.addBulk(jobs);

    return {
      success: true,
      queuedCount: users.length,
      skippedCount: dto.userIds.length - users.length,
      message: `Đã đưa ${users.length} tin nhắn vào hàng đợi gửi.`,
    };
  }

  /**
   * Get all Zalo templates
   */
  async getZaloTemplates() {
    return this.prisma.notificationTemplate.findMany({
      where: { channel: 'ZALO' },
      orderBy: { createdAt: 'desc' },
    });
  }
}
