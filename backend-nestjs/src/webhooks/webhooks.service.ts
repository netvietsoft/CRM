import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ViettelPostWebhookDto } from './dto/viettelpost-webhook.dto';
import * as crypto from 'crypto';
import { AdminNotificationsService } from '../modules/admin-notifications/admin-notifications.service';
import { PancakeService } from '../integrations/pancake/pancake.service';
import { MessagingAutomationService } from '../messaging/messaging-automation.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { OrderSourcesService } from '../order-sources/order-sources.service';
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
    private readonly vouchersService: VouchersService,
    private readonly orderSourcesService: OrderSourcesService,
    @Optional() @InjectQueue('voucher-queue') private voucherQueue?: Queue,
  ) {}

  /**
   * Chế độ CAPTURE webhook đẩy đơn ViettelPost: log + lưu 5 payload mẫu gần nhất vào
   * SystemConfig key 'viettel_order_webhook_samples' để xem đúng cấu trúc rồi map chính xác.
   * (Bước 2 sẽ thêm tạo/cập nhật đơn source='VIETTEL' dựa trên payload thật.)
   */
  async captureViettelOrderWebhook(payload: any, headers?: Record<string, string>) {
    try {
      const existing = await this.prisma.systemConfig.findUnique({
        where: { key: 'viettel_order_webhook_samples' },
      });
      const prev =
        existing && (existing.value as any)?.samples && Array.isArray((existing.value as any).samples)
          ? (existing.value as any).samples
          : [];
      prev.unshift({
        at: new Date().toISOString(),
        headers: headers || {},
        payload,
      });
      const samples = prev.slice(0, 5);
      await this.prisma.systemConfig.upsert({
        where: { key: 'viettel_order_webhook_samples' },
        update: { value: { samples } },
        create: { key: 'viettel_order_webhook_samples', value: { samples } },
      });
    } catch (e: any) {
      this.logger.warn(`[VIETTEL-ORDER] Lưu mẫu payload lỗi: ${e?.message || e}`);
    }
    return { success: true, received: true };
  }

  /** Điểm vào webhook ViettelPost: verify secret + capture mẫu + dispatch. LUÔN trả 200. */
  async handleViettelWebhook(
    payload: any,
    headers?: Record<string, string>,
  ): Promise<{ success: true; skipped?: string }> {
    await this.captureViettelOrderWebhook(payload, headers);

    try {
      const token =
        payload?.TOKEN || payload?.DATA?.token || headers?.['x-viettelpost-token'] || null;
      const { integration, anySecret } = await this.matchViettelWebhookStore(token);

      if (!integration && anySecret && process.env.NODE_ENV === 'production') {
        this.logger.warn('⛔ [VTP] Secret webhook không khớp — bỏ qua xử lý (production).');
        return { success: true, skipped: 'invalid_secret' };
      }
      if (!integration && !anySecret) {
        this.logger.warn('⚠️ [VTP] Chưa cấu hình webhookSecret cho store nào — cho qua (dev/chưa cấu hình).');
      }

      await this.processViettelPostWebhook(payload, integration?.storeId);
    } catch (e: any) {
      this.logger.error(`[VTP] Xử lý webhook lỗi (bypass, trả 200): ${e?.message || e}`);
    }
    return { success: true };
  }

  async processViettelPostWebhook(payload: ViettelPostWebhookDto, storeId?: string | null) {
    const { ORDER_NUMBER, ORDER_STATUS, STATUS_NAME } = payload.DATA;

    this.logger.log(
      `🔍 Processing order ${ORDER_NUMBER} with status ${ORDER_STATUS} (${STATUS_NAME})`,
    );

    await this.updateOrderFromWebhook(payload, storeId);

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

  private async updateOrderFromWebhook(payload: ViettelPostWebhookDto, storeId?: string | null) {
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
        `⚠️ [VTP] Không khớp đơn cho tracking ${ORDER_NUMBER} → tạo đơn source=VIETTEL.`,
      );
      await this.createOrderFromViettel(payload, storeId);
      return;
    }

    for (const order of orders) {
      const newOrderStatus = this.mapVtpStatusToOrderStatus(ORDER_STATUS);
      const location = LOCATION_CURRENTLY || LOCALION_CURRENTLY || '';
      const isPartialDelivery = this.isPartialDeliveryPayload(payload, {
        totalAmount: Number(order.totalAmount || 0),
      });

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
            ...(isPartialDelivery ? { partialDelivery: true } : {}),
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

      if (
        updatedOrder.status !== previousStatus &&
        ['CANCELLED', 'REFUNDED'].includes(updatedOrder.status) &&
        updatedOrder.paymentStatus !== 'PAID'
      ) {
        await this.releaseAppliedVouchersForOrder(updatedOrder.id);
      }

      if (isPartialDelivery && Number(MONEY_COLLECTION || 0) > 0) {
        await this.recalculateAppliedVoucherForPartialDelivery(
          updatedOrder.id,
          Number(MONEY_COLLECTION),
        );
      }

      if (
        updatedOrder.status !== previousStatus &&
        ['DELIVERED', 'PAYMENT_COLLECTED', 'COMPLETED'].includes(updatedOrder.status)
      ) {
        await this.vouchersService.processSuccessfulOrderVoucherRules(updatedOrder.id);
      }
    }
  }

  /** Tạo đơn source='VIETTEL' từ payload webhook khi không khớp đơn nào (kéo đơn về). */
  private async createOrderFromViettel(
    payload: ViettelPostWebhookDto,
    storeId?: string | null,
  ): Promise<void> {
    const d = payload.DATA;
    const orderCode = d.ORDER_NUMBER;
    if (!orderCode) return;

    await this.orderSourcesService.ensureExists('VIETTEL', 'Viettel');

    const status = this.mapVtpStatusToOrderStatus(d.ORDER_STATUS) || 'PENDING';
    const cod = Number(d.MONEY_COLLECTION || 0);
    // Giá trị đơn = COD (tiền khách trả cho hàng). Thực tế MONEY_TOTAL của VTP là TỔNG CƯỚC PHÍ
    // (phí ship + VAT), KHÔNG phải giá trị hàng → ưu tiên COD; fallback MONEY_TOTAL khi không có COD (đơn trả trước).
    const total = cod || Number(d.MONEY_TOTAL || 0);
    const paymentStatus = [500, 505].includes(d.ORDER_STATUS) ? 'PAID' : 'UNPAID';
    const statusDate = this.parseProviderDate(d.ORDER_STATUSDATE) || new Date();

    try {
      const created = await this.prisma.order.create({
        data: {
          orderCode,
          source: 'VIETTEL',
          storeId: storeId || null,
          shippingName: d.RECEIVER_FULLNAME || null,
          subtotal: total,
          totalAmount: total,
          status: status as OrderStatus,
          paymentStatus: paymentStatus as PaymentStatus,
          note: d.STATUS_NAME || d.NOTE || null,
          metadata: {
            partner: {
              provider: 'VIETTELPOST',
              trackingCode: orderCode,
              reference: d.ORDER_REFERENCE || null,
              cod,
              courierUpdates: [
                {
                  status: d.STATUS_NAME || `VTP-${d.ORDER_STATUS}`,
                  key: `VTP_${d.ORDER_STATUS}`,
                  note: d.NOTE || null,
                  update_at: statusDate.toISOString(),
                },
              ],
            },
          },
        },
      });

      this.logger.log(`✅ [VTP] Tạo đơn source=VIETTEL: ${orderCode} (status ${status})`);

      await this.adminNotificationsService.createNotification({
        type: 'VTP',
        title: `Đơn ViettelPost mới: ${orderCode}`,
        message: d.STATUS_NAME || `VTP-${d.ORDER_STATUS}`,
        link: `/admin/orders/${created.id}`,
        metadata: { orderId: created.id, trackingCode: orderCode, status: d.ORDER_STATUS, source: 'VIETTEL' },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        this.logger.warn(`[VTP] Đơn ${orderCode} đã tồn tại (P2002) → bỏ qua tạo trùng.`);
        return;
      }
      throw e;
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

  private isDeliveredPaidOrder(order?: { status?: string | null; paymentStatus?: string | null }) {
    if (!order) {
      return false;
    }

    const isDeliveredState = ['DELIVERED', 'PAYMENT_COLLECTED', 'COMPLETED'].includes(
      order.status || '',
    );
    const isPaidState = order.paymentStatus === 'PAID' || order.status === 'PAYMENT_COLLECTED';

    return isDeliveredState && isPaidState;
  }

  private isPartialDeliveryPayload(
    payload: ViettelPostWebhookDto,
    order?: { totalAmount?: number | null },
  ) {
    const statusName = `${payload.DATA.STATUS_NAME || ''} ${payload.DATA.NOTE || ''}`.toLowerCase();
    const flaggedByText =
      statusName.includes('một phần') ||
      statusName.includes('mot phan') ||
      statusName.includes('partial');

    const collectedAmount = Number(payload.DATA.MONEY_COLLECTION || 0);
    const flaggedByAmount =
      !!order?.totalAmount && collectedAmount > 0 && collectedAmount < Number(order.totalAmount);

    return flaggedByText || flaggedByAmount;
  }

  private async recalculateAppliedVoucherForPartialDelivery(
    orderId: string,
    actualCollectedAmount: number,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        subtotal: true,
        shippingFee: true,
        metadata: true,
        totalAmount: true,
        appliedVouchers: {
          select: {
            userVoucherId: true,
            discountApplied: true,
          },
        },
      },
    });

    if (!order || !order.totalAmount || actualCollectedAmount <= 0) {
      return;
    }

    const ratio = Math.max(0, Math.min(1, actualCollectedAmount / Number(order.totalAmount)));
    if (ratio >= 1 || order.appliedVouchers.length === 0) {
      return;
    }

    for (const appliedVoucher of order.appliedVouchers) {
      const currentDiscount = Number(appliedVoucher.discountApplied || 0);
      const recalculatedDiscount = Number((currentDiscount * ratio).toFixed(2));
      await this.prisma.orderVoucher.update({
        where: {
          orderId_userVoucherId: {
            orderId,
            userVoucherId: appliedVoucher.userVoucherId,
          },
        },
        data: {
          discountApplied: recalculatedDiscount,
        },
      });
    }

    const refreshedAppliedVouchers = await this.prisma.orderVoucher.findMany({
      where: { orderId },
      select: { discountApplied: true },
    });
    const voucherDiscountAmount = refreshedAppliedVouchers.reduce(
      (sum, item) => sum + Number(item.discountApplied || 0),
      0,
    );
    const metadata =
      order.metadata && typeof order.metadata === 'object' && !Array.isArray(order.metadata)
        ? (order.metadata as Record<string, any>)
        : {};
    const commissionDiscount = Number(metadata.commissionDiscount || 0);
    const nextDiscountAmount = Number((voucherDiscountAmount + commissionDiscount).toFixed(2));
    const nextTotalAmount = Math.max(
      0,
      Number(order.subtotal || 0) - nextDiscountAmount + Number(order.shippingFee || 0),
    );

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        discountAmount: nextDiscountAmount,
        totalAmount: Number(nextTotalAmount.toFixed(2)),
      },
    });
  }

  private async releaseAppliedVouchersForOrder(orderId: string) {
    const appliedVouchers = await this.prisma.orderVoucher.findMany({
      where: { orderId },
      select: { userVoucherId: true },
    });

    for (const appliedVoucher of appliedVouchers) {
      const releasedVoucher = await this.prisma.userVoucher.updateMany({
        where: {
          id: appliedVoucher.userVoucherId,
          isUsed: true,
        },
        data: {
          isUsed: false,
          usedAt: null,
        },
      });

      if (releasedVoucher.count > 0) {
        await this.prisma.voucher.updateMany({
          where: {
            userVouchers: {
              some: {
                id: appliedVoucher.userVoucherId,
              },
            },
            usedCount: {
              gt: 0,
            },
          },
          data: {
            usedCount: { decrement: 1 },
          },
        });
      }
    }
  }

  private async scheduleVoucherUnlock(userVoucher: any, payload: ViettelPostWebhookDto) {
    const { ORDER_NUMBER } = payload.DATA;

    const sourceOrder = await this.prisma.order.findFirst({
      where: {
        OR: [{ orderCode: ORDER_NUMBER }, { metadata: { string_contains: ORDER_NUMBER } }],
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
      },
    });

    if (!this.isDeliveredPaidOrder(sourceOrder)) {
      this.logger.log(
        `Voucher ${userVoucher.id} remains PENDING because order ${ORDER_NUMBER} is not delivered+paid yet.`,
      );
      return {
        action: 'pending',
        reason: 'ORDER_NOT_DELIVERED_AND_PAID',
      };
    }

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
      // Guard: voucherQueue là @Optional() — có thể undefined khi không cấu hình Redis
      if (this.voucherQueue) {
        const jobId = `unlock-voucher-${userVoucher.id}`;
        const existingJob = await this.voucherQueue.getJob(jobId);

        if (existingJob) {
          await existingJob.remove();
          this.logger.log(`🗑️ Cancelled pending unlock job ${jobId}`);
        }
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

    const sourceOrder = await this.prisma.order.findFirst({
      where: {
        OR: [{ orderCode: ORDER_NUMBER }, { metadata: { string_contains: ORDER_NUMBER } }],
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
      },
    });

    if (!this.isDeliveredPaidOrder(sourceOrder)) {
      this.logger.log(
        `Voucher ${userVoucher.id} stays PENDING because order ${ORDER_NUMBER} is not delivered+paid.`,
      );
      return {
        action: 'pending',
        reason: 'ORDER_NOT_DELIVERED_AND_PAID',
      };
    }

    try {
      await this.prisma.userVoucher.update({
        where: { id: userVoucher.id },
        data: {
          status: 'ACTIVE',
        },
      });
      await this.messagingAutomationService.handleVoucherActivated(
        userVoucher.id,
        'VIETTELPOST_WEBHOOK',
        { orderCode: ORDER_NUMBER },
      );

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

  /**
   * Đối chiếu secret webhook (payload.DATA.token) với StoreIntegration.metadata.webhookSecret
   * của các integration VIETTELPOST đang bật, dùng timingSafeEqual.
   * Trả integration khớp (để lấy storeId) + cờ anySecret (đã có store nào cấu hình secret chưa).
   */
  private async matchViettelWebhookStore(
    token?: string | null,
  ): Promise<{ integration: { id: string; storeId: string } | null; anySecret: boolean }> {
    const integrations = await this.prisma.storeIntegration.findMany({
      where: { platform: 'VIETTELPOST', isActive: true },
      select: { id: true, storeId: true, metadata: true },
    });

    let anySecret = false;
    let matched: { id: string; storeId: string } | null = null;
    const tokenBuf = token ? Buffer.from(String(token)) : null;

    for (const it of integrations) {
      const secret = (it.metadata as any)?.webhookSecret;
      if (!secret) continue;
      anySecret = true;
      if (!tokenBuf) continue;
      const secretBuf = Buffer.from(String(secret));
      if (secretBuf.length === tokenBuf.length && crypto.timingSafeEqual(secretBuf, tokenBuf)) {
        matched = { id: it.id, storeId: it.storeId };
      }
    }

    return { integration: matched, anySecret };
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
