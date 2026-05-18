import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminNotificationsGateway } from './admin-notifications.gateway';

@Injectable()
export class AdminNotificationsService {
  private readonly logger = new Logger(AdminNotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private gateway: AdminNotificationsGateway,
  ) {}

  /**
   * Create a new notification and emit it to connected admins
   */
  async createNotification(data: {
    type: string;
    title: string;
    message: string;
    link?: string;
    metadata?: any;
  }) {
    try {
      const notification = await this.prisma.adminNotification.create({
        data,
      });

      // Broadcast to connected admins
      this.gateway.emitNewNotification(notification);
      this.logger.log(`Admin notification created and emitted: ${notification.id} - ${notification.title}`);
      
      return notification;
    } catch (error) {
      this.logger.error(`Failed to create admin notification: ${error.message}`);
    }
  }

  /**
   * Get paginated notifications
   */
  async getNotifications(page = 1, limit = 20, type?: string) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (type) {
      where.type = type;
    }

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.adminNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.adminNotification.count({ where }),
      this.prisma.adminNotification.count({ where: { ...where, isRead: false } }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(id: string) {
    return this.prisma.adminNotification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Mark all unread notifications as read
   */
  async markAllAsRead(type?: string) {
    const where: any = { isRead: false };
    if (type) {
      where.type = type;
    }

    const result = await this.prisma.adminNotification.updateMany({
      where,
      data: { isRead: true },
    });

    return { updated: result.count };
  }

  /**
   * Delete a single notification
   */
  async deleteNotification(id: string) {
    await this.prisma.adminNotification.delete({
      where: { id },
    });
    return { deleted: true };
  }
}
