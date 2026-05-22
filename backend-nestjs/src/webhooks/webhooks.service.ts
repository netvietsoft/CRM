import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ViettelPostWebhookDto } from './dto/viettelpost-webhook.dto';
import * as crypto from 'crypto';
import { AdminNotificationsService } from '../modules/admin-notifications/admin-notifications.service';
import { PancakeService } from '../integrations/pancake/pancake.service';
import { MessagingAutomationService } from '../messaging/messaging-automation.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminNotificationsService: AdminNotificationsService,
    private readonly pancakeService: PancakeService,
    private readonly messagingAutomationService: MessagingAutomationService,
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
        where: { platform: 'VIETTELPOST', isActive: true, accessToken: token },
      });
      if (storeIntegration) {
        return true;
      }
    }

    if (!expectedToken) {
      this.logger.warn(
        '⚠️ VIETTELPOST_WEBHOOK_TOKEN not configured and no store integration matched',
      );
      return true;
    }

    if (token !== expectedToken) {
      return false;
    }

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
    const { ORDER_NUMBER, ORDER_STATUS, STATUS_NAME } = payload.DATA;

    this.logger.log(
      `🔍 Processing order ${ORDER_NUMBER} with status ${ORDER_STATUS} (${STATUS_NAME})`,
    );

    await this.updateOrderFromWebhook(payload);

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
      this.logger.log(`ℹ️ No voucher found for order ${ORDER_NUMBER}. Skipping voucher logic.`);
      return {
        action: 'order_updated',
        voucherAction: 'skipped',
        reason: 'No voucher associated with this order',
      };
    }

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

  private async updateOrderFromWebhook(payload: ViettelPostWebhookDto) {
    const {
      ORDER_NUMBER,
      ORDER_STATUS,
      STATUS_NAME,
      ORDER_STATUSDATE,
      NOTE,
      LOCALION_CURRENTLY,
      LOCATION_CURRENTLY,
      MONEY_COLLECTION,
      ORDER_REFERENCE,
    } = payload.DATA;

    let pancakeOrderId: string | null = null;
    if (ORDER_REFERENCE) {
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

    let orders = await this.prisma.order.findMany({
      where: {
        OR: searchConditions,
      },
    });

    if (orders.length === 0 && pancakeOrderId) {
      this.logger.warn(
        `⚠️ No order found for tracking code ${ORDER_NUMBER}. Attempting to sync from Pancake using ORDER_REFERENCE ID: ${pancakeOrderId}`,
      );
      const synced = await this.tryPancakeSyncById(Number(pancakeOrderId));

      if (synced) {
        orders = await this.prisma.order.findMany({
          where: { OR: searchConditions },
        });

        if (orders.length > 0) {
          this.logger.log(`✅ Found order after Pancake sync, continuing webhook processing.`);
        }
      }
    }

    if (orders.length === 0) {
      this.logger.warn(
        `⚠️ No order found for tracking code ${ORDER_NUMBER} after all sync attempts.`,
      );

      await this.adminNotificationsService.createNotification({
        type: 'VTP',
        title: `Cập nhật vận chuyển: ${ORDER_NUMBER}`,
        message: `${STATUS_NAME || `VTP-${ORDER_STATUS}`} (không tìm thấy đơn hàng liên kết)`,
        link: '/admin/orders',
        metadata: {
          trackingCode: ORDER_NUMBER,
          status: ORDER_STATUS,
          statusName: STATUS_NAME,
          reference: ORDER_REFERENCE,
        },
      });
      return;
    }

    for (const order of orders) {
      const newOrderStatus = this.mapVtpStatusToOrderStatus(ORDER_STATUS);
      const location = LOCATION_CURRENTLY || LOCALION_CURRENTLY || '';

      const courierUpdate = {
        status: STATUS_NAME || `VTP-${ORDER_STATUS}`,
        key: `VTP_${ORDER_STATUS}`,
        note: [NOTE, location].filter(Boolean).join(' - ') || null,
        update_at:
          this.parseProviderDate(ORDER_STATUSDATE)?.toISOString() || new Date().toISOString(),
      };

      const existingMeta = (order.metadata as any) || {};
      const existingPartner = existingMeta.partner || {};
      const existingUpdates: any[] = existingPartner.courierUpdates || [];

      const isDuplicate = existingUpdates.some(
        (u: any) => u.key === courierUpdate.key && u.update_at === courierUpdate.update_at,
      );

      if (isDuplicate) {
        this.logger.log(
          `ℹ️ Duplicate webhook for order ${order.orderCode}, skipping metadata update.`,
        );
        continue;
      }

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

      if (newOrderStatus) {
        updateData.status = newOrderStatus;
      }

      const updatedOrder = await this.prisma.order.update({
        where: { id: order.id },
        data: updateData,
      });

      this.logger.log(
        `✅ Order ${order.orderCode} updated: status → ${newOrderStatus || '(unchanged)'}, courier update added`,
      );

      const previousStatus = order.status;
      const statusChanged = newOrderStatus && newOrderStatus !== previousStatus;
      const statusLabelMap: Record<string, string> = {
        PENDING: 'Chờ xác nhận',
        CONFIRMED: 'Đã xác nhận',
        WAITING_FOR_GOODS: 'Chờ hàng',
        PACKAGING: 'Đang đóng gói',
        WAITING_FOR_SHIPPING: 'Chờ vận chuyển',
        SHIPPED: 'Đang giao hàng',
        DELIVERED: 'Đã nhận hàng',
        PAYMENT_COLLECTED: 'Đã thu tiền',
        COMPLETED: 'Hoàn thành',
        CANCELLED: 'Đã hủy',
        REFUNDED: 'Hoàn trả',
        RETURNING: 'Đang hoàn',
      };

      let nMessage: string;
      if (statusChanged) {
        const oldLabel = statusLabelMap[previousStatus] || previousStatus;
        const newLabel = statusLabelMap[newOrderStatus] || newOrderStatus;
        nMessage = `${oldLabel} → ${newLabel}`;
      } else {
        nMessage = STATUS_NAME || `VTP-${ORDER_STATUS}`;
      }

      await this.adminNotificationsService.createNotification({
        type: 'VTP',
        title: `Đơn hàng ${order.orderCode} cập nhật vận chuyển`,
        message: nMessage,
        link: `/admin/orders/${order.id}`,
        metadata: {
          orderId: order.id,
          orderCode: order.orderCode,
          status: newOrderStatus,
          previousStatus,
          trackingCode: ORDER_NUMBER,
        },
      });

      await this.messagingAutomationService.handleOrderStateChange({
        orderId: updatedOrder.id,
        previousStatus: order.status as OrderStatus,
        currentStatus: updatedOrder.status as OrderStatus,
        previousPaymentStatus: order.paymentStatus as PaymentStatus,
        currentPaymentStatus: updatedOrder.paymentStatus as PaymentStatus,
        source: 'VIETTELPOST_WEBHOOK',
        payload: {
          trackingCode: ORDER_NUMBER,
          orderStatus: ORDER_STATUS,
          statusName: STATUS_NAME || null,
        },
      });
    }
  }

  private parseProviderDate(value?: string | null): Date | null {
    if (!value) return null;

    const normalized = value.trim();
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) return parsed;

    const dateTimeMatch =
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/.exec(normalized);
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

    const sqlDateTimeMatch =
      /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/.exec(normalized);
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

  private mapVtpStatusToOrderStatus(vtpStatus: number): string | null {
    switch (vtpStatus) {
      case 100:
      case 101:
        return null;

      case 102:
      case 200:
      case 201:
      case 300:
      case 301:
        return 'SHIPPED';

      case 501:
      case 515:
        return 'DELIVERED';

      case 500:
      case 505:
        return 'PAYMENT_COLLECTED';

      case 502:
      case 510:
        return 'RETURNING';

      case 503:
      case 504:
      case 107:
        return 'CANCELLED';

      default:
        return null;
    }
  }

  private mapStatusToAction(
    status: number,
  ): 'SCHEDULE_UNLOCK' | 'REJECT_IMMEDIATELY' | 'ACTIVATE_IMMEDIATELY' | 'NO_ACTION' {
    switch (status) {
      case 501:
      case 515:
        return 'SCHEDULE_UNLOCK';

      case 502:
      case 503:
      case 504:
      case 107:
      case 550:
        return 'REJECT_IMMEDIATELY';

      default:
        return 'NO_ACTION';
    }
  }

  private async scheduleVoucherUnlock(userVoucher: any, payload: ViettelPostWebhookDto) {
    const { ORDER_NUMBER } = payload.DATA;

    if (!this.voucherQueue) {
      this.logger.warn(
        '⚠️  Queue not available - cannot schedule voucher unlock. Activating immediately instead.',
      );
      return await this.activateVoucherImmediately(userVoucher, payload);
    }

    if (userVoucher.status !== 'PENDING') {
      this.logger.warn(
        `⚠️ Voucher ${userVoucher.id} is not PENDING (current: ${userVoucher.status}). Skipping schedule.`,
      );
      return {
        action: 'skipped',
        reason: `Voucher already in ${userVoucher.status} state`,
      };
    }

    const jobId = `unlock-voucher-${userVoucher.id}`;
    const unlockDate = new Date(Date.now() + this.SEVEN_DAYS_MS);

    try {
      const existingJob = await this.voucherQueue.getJob(jobId);
      if (existingJob) {
        await existingJob.remove();
        this.logger.log(`🗑️ Removed existing job ${jobId}`);
      }

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
            delay: 60000,
          },
        },
      );

      this.logger.log(
        `⏰ Scheduled voucher unlock for ${userVoucher.id} at ${unlockDate.toISOString()} (Job ID: ${job.id})`,
      );

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
    } catch (error: any) {
      this.logger.error(`❌ Failed to schedule unlock: ${error.message}`);
      throw error;
    }
  }

  private async rejectVoucherImmediately(userVoucher: any, payload: ViettelPostWebhookDto) {
    const { ORDER_NUMBER, STATUS_NAME } = payload.DATA;

    try {
      const jobId = `unlock-voucher-${userVoucher.id}`;
      const existingJob = await this.voucherQueue.getJob(jobId);

      if (existingJob) {
        await existingJob.remove();
        this.logger.log(`🗑️ Cancelled pending unlock job ${jobId}`);
      }

      await this.prisma.userVoucher.update({
        where: { id: userVoucher.id },
        data: {
          status: 'REJECTED',
        },
      });

      this.logger.log(
        `❌ Voucher ${userVoucher.id} REJECTED due to order status: ${STATUS_NAME} (Order: ${ORDER_NUMBER})`,
      );

      return {
        action: 'rejected',
        userVoucherId: userVoucher.id,
        reason: STATUS_NAME,
      };
    } catch (error: any) {
      this.logger.error(`❌ Failed to reject voucher: ${error.message}`);
      throw error;
    }
  }

  private async activateVoucherImmediately(userVoucher: any, payload: ViettelPostWebhookDto) {
    const { ORDER_NUMBER } = payload.DATA;

    try {
      await this.prisma.userVoucher.update({
        where: { id: userVoucher.id },
        data: {
          status: 'ACTIVE',
        },
      });

      this.logger.log(
        `✅ Voucher ${userVoucher.id} ACTIVATED immediately (Order: ${ORDER_NUMBER})`,
      );

      return {
        action: 'activated',
        userVoucherId: userVoucher.id,
      };
    } catch (error: any) {
      this.logger.error(`❌ Failed to activate voucher: ${error.message}`);
      throw error;
    }
  }

  private async tryPancakeSyncById(orderId: number): Promise<boolean> {
    try {
      const integration = await this.prisma.storeIntegration.findFirst({
        where: { platform: 'PANCAKE', isActive: true },
        include: { store: true },
      });

      if (!integration || !integration.store) {
        this.logger.warn('[VTP→Pancake] No active Pancake integration found');
        return false;
      }

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

      this.logger.log(
        `[VTP→Pancake] Order PCK-${orderId} was found but sync logic returned false (e.g. no phone number)`,
      );
      return false;
    } catch (error: any) {
      this.logger.error(
        `[VTP→Pancake] Error during sync attempt for ID ${orderId}: ${error.message}`,
      );
      return false;
    }
  }
}
