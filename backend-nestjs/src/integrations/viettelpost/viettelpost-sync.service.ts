import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ViettelpostAuthService } from './viettelpost-auth.service';
import { ViettelCustomerService } from './viettel-customer.service';
import { VouchersService } from '../../vouchers/vouchers.service';

/**
 * Cron RECONCILE đơn ViettelPost (mỗi 10 phút).
 *
 * ViettelPost là PUSH (webhook) — không có API "lấy danh sách đơn". Cron này RE-CHECK các đơn
 * source='VIETTEL' CHƯA ở trạng thái cuối: gọi order/detail-v2 (qua ViettelpostAuthService) →
 * cập nhật trạng thái Order (phòng webhook miss) + ENRICH viettel_customers (SĐT/địa chỉ/tên SP
 * mà webhook không gửi).
 *
 * Env:
 *  - VIETTELPOST_RECONCILE=false : tắt cron
 *  - VIETTELPOST_SYNC_CRON=...    : đổi lịch (chuỗi cron, mặc định mỗi 10 phút)
 */
@Injectable()
export class ViettelpostSyncService {
  private readonly logger = new Logger(ViettelpostSyncService.name);
  private reconcileRunning = false;

  // Trạng thái cuối — không cần reconcile nữa.
  private readonly FINAL_STATUSES = [
    'DELIVERED',
    'PAYMENT_COLLECTED',
    'COMPLETED',
    'CANCELLED',
    'REFUNDED',
    'RETURNING',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: ViettelpostAuthService,
    private readonly customerService: ViettelCustomerService,
    private readonly vouchersService: VouchersService,
  ) {}

  // Map mã trạng thái VTP → OrderStatus (đồng nhất với webhooks.service.mapVtpStatusToOrderStatus).
  private mapVtpStatus(vtp: number): string | null {
    if ([102, 200, 201, 300, 301].includes(vtp)) return 'SHIPPED';
    if ([501, 515].includes(vtp)) return 'DELIVERED';
    if ([500, 505].includes(vtp)) return 'PAYMENT_COLLECTED';
    if ([502, 510].includes(vtp)) return 'RETURNING';
    if ([503, 504, 107].includes(vtp)) return 'CANCELLED';
    return null;
  }

  @Cron(process.env.VIETTELPOST_SYNC_CRON || CronExpression.EVERY_10_MINUTES, {
    name: 'viettelpost-reconcile',
  })
  async handleReconcileCron() {
    if (process.env.VIETTELPOST_RECONCILE === 'false') return;

    if (this.reconcileRunning) {
      this.logger.warn('[VTP] Reconcile: lượt trước chưa xong, bỏ qua lượt này');
      return;
    }
    this.reconcileRunning = true;

    try {
      const result = await this.reconcileOpenOrders();
      if (result.candidates > 0) {
        this.logger.log(
          `[VTP] Reconcile: ${result.candidates} đơn cần đồng bộ → updated ${result.updated}, skipped ${result.skipped}` +
            (result.updated === 0 ? ' (API tra cứu partner2 CHƯA cắm — xem ViettelpostSyncService.fetchOrderStatusFromViettel)' : ''),
        );
      }
    } catch (error: any) {
      this.logger.error(`[VTP] Reconcile lỗi: ${error?.message || error}`);
    } finally {
      this.reconcileRunning = false;
    }
  }

  /**
   * Duyệt các đơn VIETTEL chưa ở trạng thái cuối, gọi API VTP lấy trạng thái mới, cập nhật nếu đổi.
   * Trả số liệu để cron log. Tách khỏi cron để test trực tiếp.
   */
  async reconcileOpenOrders(): Promise<{ candidates: number; updated: number; skipped: number }> {
    const orders = await this.prisma.order.findMany({
      where: { source: 'VIETTEL', status: { notIn: this.FINAL_STATUSES as any } },
      select: { id: true, orderCode: true, status: true, metadata: true },
    });

    let updated = 0;
    let skipped = 0;

    for (const order of orders) {
      const trackingCode = (order.metadata as any)?.partner?.trackingCode || order.orderCode;
      const detail = await this.fetchOrderDetail(trackingCode);
      if (!detail) {
        skipped++;
        continue;
      }

      // Enrich bảng viettel_customers (SĐT/địa chỉ/SP từ detail-v2).
      await this.customerService.enrichFromDetail(trackingCode, detail);

      // Cập nhật trạng thái Order nếu VTP có trạng thái mới (phòng webhook miss).
      const vtpStatus = Number(detail.ORDER_STATUS);
      const mapped = Number.isNaN(vtpStatus) ? null : this.mapVtpStatus(vtpStatus);
      if (mapped && mapped !== order.status) {
        const updatedOrder = await this.prisma.order.update({
          where: { id: order.id },
          data: { status: mapped as any },
        });

        // Đồng bộ kích hoạt voucher riêng của đơn (best-effort — không làm hỏng cron reconcile).
        try {
          await this.vouchersService.syncOrderVoucherActivation({
            id: updatedOrder.id,
            orderCode: updatedOrder.orderCode,
            status: updatedOrder.status,
            totalAmount: updatedOrder.totalAmount,
            isExchange: (updatedOrder as any).isExchange === true,
          });
        } catch (err: any) {
          this.logger.error(
            `[VTP] syncOrderVoucherActivation failed for order ${updatedOrder.orderCode}: ${err?.message || err}`,
          );
        }
      }
      updated++;
    }

    return { candidates: orders.length, updated, skipped };
  }

  /** Gọi order/detail-v2?o=<trackingCode> (GET, kèm token) → object DATA hoặc null. */
  private async fetchOrderDetail(trackingCode: string): Promise<any | null> {
    if (!trackingCode) return null;
    const json = await this.authService.get(
      `order/detail-v2?o=${encodeURIComponent(trackingCode)}`,
    );
    if (json?.status === 200 && json?.data) return json.data;
    return null;
  }

  /**
   * Liệt kê đơn ĐÃ TẢI VỀ từ ViettelPost (source='VIETTEL') cho trang admin xem bảng.
   * Bóc các field VTP từ metadata.partner (trackingCode, cod, hành trình) thành phẳng dễ render.
   */
  async listPulledOrders(): Promise<
    Array<{
      id: string;
      orderCode: string;
      trackingCode: string | null;
      status: string;
      cod: number;
      totalAmount: number;
      shippingName: string | null;
      currentLocation: string | null;
      updateCount: number;
      lastUpdateAt: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    const orders = await this.prisma.order.findMany({
      where: { source: 'VIETTEL' },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        orderCode: true,
        status: true,
        totalAmount: true,
        shippingName: true,
        createdAt: true,
        updatedAt: true,
        metadata: true,
      },
    });

    return orders.map((o) => {
      const partner = (o.metadata as any)?.partner || {};
      const updates: any[] = Array.isArray(partner.courierUpdates) ? partner.courierUpdates : [];
      const last = updates[updates.length - 1];
      return {
        id: o.id,
        orderCode: o.orderCode,
        trackingCode: partner.trackingCode || null,
        status: o.status,
        cod: Number(partner.cod ?? o.totalAmount ?? 0),
        totalAmount: Number(o.totalAmount ?? 0),
        shippingName: o.shippingName || null,
        currentLocation: last?.note || null,
        updateCount: updates.length,
        lastUpdateAt: last?.update_at || null,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      };
    });
  }
}
