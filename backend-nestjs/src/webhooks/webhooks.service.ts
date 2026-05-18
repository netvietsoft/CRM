import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ViettelPostWebhookDto } from './dto/viettelpost-webhook.dto';
import * as crypto from 'crypto';
import { AdminNotificationsService } from '../modules/admin-notifications/admin-notifications.service';
import { PancakeService } from '../integrations/pancake/pancake.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminNotificationsService: AdminNotificationsService,
    private readonly pancakeService: PancakeService,
    @Optional() @InjectQueue('voucher-queue') private voucherQueue?: Queue,
  ) {}

  async validateWebhookToken(
    token: string,
    signature: string,
    payload: ViettelPostWebhookDto,
  ): Promise<boolean> {
    const expectedToken = process.env.VIETTELPOST_WEBHOOK_TOKEN;

    if (token) {
      const storeIntegration = await this.prisma.storeIntegration.findFirst({
        where: { platform: 'VIETTELPOST', isActive: true, accessToken: token }
      });
      if (storeIntegration) {
        return true;
      }
    }

    // If no token configured, log warning but allow (for development)
    if (!expectedToken) {
      this.logger.warn('⚠️ VIETTELPOST_WEBHOOK_TOKEN not configured and no store integration matched');
      return true; // Allow in development
    }

    // Simple token validation
    if (token !== expectedToken) {
      return false;
    }

    // Optional: Validate signature if ViettelPost provides one
    if (signature && process.env.VIETTELPOST_WEBHOOK_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.VIETTELPOST_WEBHOOK_SECRET)
        .update(JSON.stringify(payload))
        .digest('hex');

      return signature === expectedSignature;
    }

    return true;
  }

  async processViettelPostWebhook(payload: ViettelPostWebhookDto) {
    const { ORDER_NUMBER, ORDER_STATUS, STATUS_NAME, ORDER_STATUSDATE, NOTE, LOCALION_CURRENTLY, LOCATION_CURRENTLY, MONEY_COLLECTION } = payload.DATA;

    this.logger.log(
      `🔍 Processing order ${ORDER_NUMBER} with status ${ORDER_STATUS} (${STATUS_NAME})`,
    );

    // ── 1. Update the Order record ──
    await this.updateOrderFromWebhook(payload);

    // ── 2. Handle voucher logic (existing behavior) ──
    // Find UserVoucher associated with this order
    const userVoucher = await this.prisma.userVoucher.findUnique({
      where: { sourceOrderCode: ORDER_NUMBER },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        voucher: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!userVoucher) {
      this.logger.log(
        `ℹ️ No voucher found for order ${ORDER_NUMBER}. Skipping voucher logic.`,
      );
      return {
        action: 'order_updated',
        voucherAction: 'skipped',
        reason: 'No voucher associated with this order',
      };
    }

    // Map ViettelPost status to action
    const action = this.mapStatusToAction(ORDER_STATUS);

    switch (action) {
      case 'SCHEDULE_UNLOCK':
        return await this.scheduleVoucherUnlock(userVoucher, payload);

      case 'REJECT_IMMEDIATELY':
        return await this.rejectVoucherImmediately(userVoucher, payload);

      case 'ACTIVATE_IMMEDIATELY':
        return await this.activateVoucherImmediately(userVoucher, payload);

      default:
        this.logger.log(
          `ℹ️ Status ${ORDER_STATUS} does not require voucher action. Keeping current state.`,
        );
        return {
          action: 'order_updated',
          voucherAction: 'no_action',
          status: ORDER_STATUS,
        };
    }
  }

  /**
   * Find the Order by tracking code and update its status + metadata
   */
  private async updateOrderFromWebhook(payload: ViettelPostWebhookDto) {
    const { ORDER_NUMBER, ORDER_STATUS, STATUS_NAME, ORDER_STATUSDATE, NOTE, LOCALION_CURRENTLY, LOCATION_CURRENTLY, MONEY_COLLECTION, ORDER_REFERENCE } = payload.DATA;

    let pancakeOrderId: string | null = null;
    if (ORDER_REFERENCE) {
      // Extract numeric part from PKE123456
      const numericPart = ORDER_REFERENCE.replace(/\D/g, '');
      if (numericPart) {
        pancakeOrderId = numericPart;
      }
    }

    const searchConditions: any[] = [
      { orderCode: ORDER_NUMBER },
      {
        metadata: {
          path: '$.partner.trackingCode',
          equals: ORDER_NUMBER,
        },
      },
    ];

    if (ORDER_REFERENCE) {
      searchConditions.push({ orderCode: ORDER_REFERENCE });
    }
    if (pancakeOrderId) {
      searchConditions.push({ orderCode: `PCK-${pancakeOrderId}` });
    }

    // Find order by tracking code in metadata OR by orderCode
    let orders = await this.prisma.order.findMany({
      where: {
        OR: searchConditions,
      },
    });

    // If order not found but we have a pancakeOrderId, try to sync from Pancake directly
    if (orders.length === 0 && pancakeOrderId) {
      this.logger.warn(`⚠️ No order found for tracking code ${ORDER_NUMBER}. Attempting to sync from Pancake using ORDER_REFERENCE ID: ${pancakeOrderId}`);
      const synced = await this.tryPancakeSyncById(Number(pancakeOrderId));
      
      if (synced) {
        // Re-query after sync
        orders = await this.prisma.order.findMany({
          where: { OR: searchConditions },
        });
        
        if (orders.length > 0) {
          this.logger.log(`✅ Found order after Pancake sync, continuing webhook processing.`);
        }
      }
    }

    if (orders.length === 0) {
      this.logger.warn(`⚠️ No order found for tracking code ${ORDER_NUMBER} after all sync attempts.`);

      // Fire notification so admin knows a webhook came in
      await this.adminNotificationsService.createNotification({
        type: 'VTP',
        title: `Cập nhật vận chuyển: ${ORDER_NUMBER}`,
        message: `${STATUS_NAME || `VTP-${ORDER_STATUS}`} (không tìm thấy đơn hàng liên kết)`,
        link: '/admin/orders',
        metadata: { trackingCode: ORDER_NUMBER, status: ORDER_STATUS, statusName: STATUS_NAME, reference: ORDER_REFERENCE },
      });
      return;
    }

    for (const order of orders) {
      // Map ViettelPost status code to our OrderStatus enum
      const newOrderStatus = this.mapVtpStatusToOrderStatus(ORDER_STATUS);
      const location = LOCATION_CURRENTLY || LOCALION_CURRENTLY || '';

      // Build courier update entry
      const courierUpdate = {
        status: STATUS_NAME || `VTP-${ORDER_STATUS}`,
        key: `VTP_${ORDER_STATUS}`,
        note: [NOTE, location].filter(Boolean).join(' - ') || null,
        update_at: this.parseProviderDate(ORDER_STATUSDATE)?.toISOString() || new Date().toISOString(),
      };

      // Get existing metadata
      const existingMeta = (order.metadata as any) || {};
      const existingPartner = existingMeta.partner || {};
      const existingUpdates: any[] = existingPartner.courierUpdates || [];

      // Avoid duplicate updates (same status + same timestamp)
      const isDuplicate = existingUpdates.some(
        (u: any) => u.key === courierUpdate.key && u.update_at === courierUpdate.update_at,
      );

      if (isDuplicate) {
        this.logger.log(`ℹ️ Duplicate webhook for order ${order.orderCode}, skipping metadata update.`);
        continue;
      }

      // Build update data
      const updateData: any = {
        metadata: {
          ...existingMeta,
          partner: {
            ...existingPartner,
            trackingCode: existingPartner.trackingCode || ORDER_NUMBER,
            courierUpdates: [...existingUpdates, courierUpdate],
            ...(MONEY_COLLECTION !== undefined ? { cod: MONEY_COLLECTION } : {}),
          },
        },
        updatedAt: this.parseProviderDate(ORDER_STATUSDATE) || new Date(),
      };

      // Update order status if we have a valid mapping
      if (newOrderStatus) {
        updateData.status = newOrderStatus;
      }

      await this.prisma.order.update({
        where: { id: order.id },
        data: updateData,
      });

      this.logger.log(
        `✅ Order ${order.orderCode} updated: status → ${newOrderStatus || '(unchanged)'}, courier update added`,
      );

      // Build meaningful notification message
      const previousStatus = order.status;
      const statusChanged = newOrderStatus && newOrderStatus !== previousStatus;
      const statusLabelMap: Record<string, string> = {
        PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', WAITING_FOR_GOODS: 'Chờ hàng',
        PACKAGING: 'Đang đóng gói', WAITING_FOR_SHIPPING: 'Chờ vận chuyển', SHIPPED: 'Đang giao hàng',
        DELIVERED: 'Đã nhận hàng', PAYMENT_COLLECTED: 'Đã thu tiền', COMPLETED: 'Hoàn thành',
        CANCELLED: 'Đã hủy', REFUNDED: 'Hoàn trả', RETURNING: 'Đang hoàn',
      };

      let nMessage: string;
      if (statusChanged) {
        const oldLabel = statusLabelMap[previousStatus] || previousStatus;
        const newLabel = statusLabelMap[newOrderStatus] || newOrderStatus;
        nMessage = `${oldLabel} → ${newLabel}`;
      } else {
        nMessage = STATUS_NAME || `VTP-${ORDER_STATUS}`;
      }

      // Trigger admin notification
      await this.adminNotificationsService.createNotification({
        type: 'VTP',
        title: `Đơn hàng ${order.orderCode} cập nhật vận chuyển`,
        message: nMessage,
        link: `/admin/orders/${order.id}`,
        metadata: { orderId: order.id, orderCode: order.orderCode, status: newOrderStatus, previousStatus, trackingCode: ORDER_NUMBER },
      });
    }
  }

  private parseProviderDate(value?: string | null): Date | null {
    if (!value) return null;

    const normalized = value.trim();
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) return parsed;

    const dateTimeMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/.exec(normalized);
    if (dateTimeMatch) {
      const [, day, month, year, hour = '0', minute = '0', second = '0'] = dateTimeMatch;
      const localDate = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
      );
      return Number.isNaN(localDate.getTime()) ? null : localDate;
    }

    const sqlDateTimeMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/.exec(normalized);
    if (sqlDateTimeMatch) {
      const [, year, month, day, hour = '0', minute = '0', second = '0'] = sqlDateTimeMatch;
      const localDate = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
      );
      return Number.isNaN(localDate.getTime()) ? null : localDate;
    }

    return null;
  }

  /**
   * Map ViettelPost status codes to our OrderStatus enum
   */
  private mapVtpStatusToOrderStatus(vtpStatus: number): string | null {
    // ViettelPost status codes reference
    switch (vtpStatus) {
      // Picking up
      case 100: // Đơn hàng mới tạo
      case 101: // Chờ lấy hàng
        return null; // Keep current status

      case 102: // Đã lấy hàng
      case 200: // Đang vận chuyển
      case 201: // Đang vận chuyển
      case 300: // Đang giao hàng
      case 301: // Đang giao hàng
        return 'SHIPPED';

      case 501: // Đã giao hàng thành công
      case 515: // Đã ký nhận
        return 'DELIVERED';

      case 500: // Đã thu tiền (COD)
      case 505: // Đã đối soát
        return 'PAYMENT_COLLECTED';

      case 502: // Đang hoàn hàng
      case 510: // Đang hoàn hàng
        return 'RETURNING';

      case 503: // Đã hoàn hàng
      case 504: // Hủy đơn
      case 107: // Hủy đơn hàng
        return 'CANCELLED';

      default:
        return null; // Unknown status, don't change
    }
  }

  private mapStatusToAction(
    status: number,
  ): 'SCHEDULE_UNLOCK' | 'REJECT_IMMEDIATELY' | 'ACTIVATE_IMMEDIATELY' | 'NO_ACTION' {
    // ViettelPost status codes mapping
    // Reference: https://partner2.viettelpost.vn/document/webhook
    
    switch (status) {
      // Delivered successfully - Schedule unlock after 7 days
      case 501: // Đã giao hàng
      case 515: // Đã ký nhận
        return 'SCHEDULE_UNLOCK';

      // Returned/Cancelled - Reject immediately
      case 502: // Hoàn trả
      case 503: // Hủy đơn
      case 504: // Đã hủy
      case 107: // Hủy đơn hàng
      case 550: // Không liên hệ được người nhận
        return 'REJECT_IMMEDIATELY';

      // Other statuses - No action needed
      default:
        return 'NO_ACTION';
    }
  }

  private async scheduleVoucherUnlock(userVoucher: any, payload: ViettelPostWebhookDto) {
    const { ORDER_NUMBER } = payload.DATA;

    // Check if queue is available
    if (!this.voucherQueue) {
      this.logger.warn('⚠️  Queue not available - cannot schedule voucher unlock. Activating immediately instead.');
      return await this.activateVoucherImmediately(userVoucher, payload);
    }

    // Check if voucher is still in PENDING state
    if (userVoucher.status !== 'PENDING') {
      this.logger.warn(
        `⚠️ Voucher ${userVoucher.id} is not PENDING (current: ${userVoucher.status}). Skipping schedule.`,
      );
      return {
        action: 'skipped',
        reason: `Voucher already in ${userVoucher.status} state`,
      };
    }

    // Create a delayed job to unlock voucher after 7 days
    const jobId = `unlock-voucher-${userVoucher.id}`;
    const unlockDate = new Date(Date.now() + this.SEVEN_DAYS_MS);

    try {
      // Remove existing job if any (idempotency)
      const existingJob = await this.voucherQueue.getJob(jobId);
      if (existingJob) {
        await existingJob.remove();
        this.logger.log(`🗑️ Removed existing job ${jobId}`);
      }

      // Add new delayed job
      const job = await this.voucherQueue.add(
        'unlock-voucher-task',
        {
          userVoucherId: userVoucher.id,
          orderCode: ORDER_NUMBER,
          userId: userVoucher.userId,
          voucherCode: userVoucher.voucher.code,
          scheduledAt: new Date().toISOString(),
        },
        {
          jobId,
          delay: this.SEVEN_DAYS_MS,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 60000, // 1 minute
          },
        },
      );

      this.logger.log(
        `⏰ Scheduled voucher unlock for ${userVoucher.id} at ${unlockDate.toISOString()} (Job ID: ${job.id})`,
      );

      // Update unlockAt timestamp in database
      await this.prisma.userVoucher.update({
        where: { id: userVoucher.id },
        data: { unlockAt: unlockDate },
      });

      return {
        action: 'scheduled',
        jobId: job.id,
        unlockAt: unlockDate,
        userVoucherId: userVoucher.id,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to schedule unlock: ${error.message}`);
      throw error;
    }
  }

  private async rejectVoucherImmediately(userVoucher: any, payload: ViettelPostWebhookDto) {
    const { ORDER_NUMBER, STATUS_NAME } = payload.DATA;

    try {
      // Cancel any pending unlock jobs
      const jobId = `unlock-voucher-${userVoucher.id}`;
      const existingJob = await this.voucherQueue.getJob(jobId);
      
      if (existingJob) {
        await existingJob.remove();
        this.logger.log(`🗑️ Cancelled pending unlock job ${jobId}`);
      }

      // Update voucher status to REJECTED
      await this.prisma.userVoucher.update({
        where: { id: userVoucher.id },
        data: {
          status: 'REJECTED',
        },
      });

      this.logger.log(
        `❌ Voucher ${userVoucher.id} REJECTED due to order status: ${STATUS_NAME} (Order: ${ORDER_NUMBER})`,
      );

      // TODO: Send notification to user about rejected voucher
      // await this.notificationService.sendVoucherRejected(userVoucher.userId, ...);

      return {
        action: 'rejected',
        userVoucherId: userVoucher.id,
        reason: STATUS_NAME,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to reject voucher: ${error.message}`);
      throw error;
    }
  }

  private async activateVoucherImmediately(userVoucher: any, payload: ViettelPostWebhookDto) {
    const { ORDER_NUMBER } = payload.DATA;

    try {
      // Update voucher status to ACTIVE
      await this.prisma.userVoucher.update({
        where: { id: userVoucher.id },
        data: {
          status: 'ACTIVE',
        },
      });

      this.logger.log(
        `✅ Voucher ${userVoucher.id} ACTIVATED immediately (Order: ${ORDER_NUMBER})`,
      );

      // TODO: Send notification to user about activated voucher
      // await this.notificationService.sendVoucherActivated(userVoucher.userId, ...);

      return {
        action: 'activated',
        userVoucherId: userVoucher.id,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to activate voucher: ${error.message}`);
      throw error;
    }
  }

  /**
   * Try to find an order on Pancake by its specific Order ID and sync it
   */
  private async tryPancakeSyncById(orderId: number): Promise<boolean> {
    try {
      // Get any active Pancake integration
      const integration = await this.prisma.storeIntegration.findFirst({
        where: { platform: 'PANCAKE', isActive: true },
        include: { store: true },
      });

      if (!integration || !integration.store) {
        this.logger.warn('[VTP→Pancake] No active Pancake integration found');
        return false;
      }

      // Fetch order by ID from Pancake
      const orderDetail = await this.pancakeService.fetchOrderDetail(orderId, integration.storeId);
      
      if (!orderDetail) {
        this.logger.log(`[VTP→Pancake] Pancake order ID ${orderId} not found or failed to fetch.`);
        return false;
      }

      this.logger.log(`[VTP→Pancake] Found Pancake order ${orderId}. Syncing...`);
      
      const result = await this.pancakeService.syncSingleOrder(orderDetail, integration.storeId);
      
      if (result.synced) {
        this.logger.log(`[VTP→Pancake] Successfully synced order PCK-${orderId}`);
        return true;
      }

      this.logger.log(`[VTP→Pancake] Order PCK-${orderId} was found but sync logic returned false (e.g. no phone number)`);
      return false;
    } catch (error) {
      this.logger.error(`[VTP→Pancake] Error during sync attempt for ID ${orderId}: ${error.message}`);
      return false;
    }
  }
}
