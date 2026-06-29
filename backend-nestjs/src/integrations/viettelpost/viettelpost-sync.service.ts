import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Cron RECONCILE đơn ViettelPost (khung — phần gọi API VTP cắm sau).
 *
 * ViettelPost là PUSH (webhook) — không có API "lấy danh sách đơn". Cron này chỉ RE-CHECK
 * trạng thái các đơn source='VIETTEL' CHƯA ở trạng thái cuối, phòng khi webhook bị miss
 * (tunnel/sập). Với mỗi đơn → gọi fetchOrderStatusFromViettel(trackingCode) rồi cập nhật.
 *
 * ⚠️ fetchOrderStatusFromViettel HIỆN LÀ STUB (trả null) vì endpoint tra cứu của partner2 (API mới)
 * chưa có spec chính xác — endpoint cũ partner.viettelpost.vn/v2/order/getOrderInfoByCode trả 405.
 * Khi có spec: cắm HTTP call vào method đó (dùng token = accessToken của StoreIntegration VIETTELPOST),
 * map ORDER_STATUS → OrderStatus rồi update đơn. Phần còn lại của cron đã sẵn sàng.
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

  constructor(private readonly prisma: PrismaService) {}

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

    const token = await this.getViettelToken();
    let updated = 0;
    let skipped = 0;

    for (const order of orders) {
      const trackingCode =
        (order.metadata as any)?.partner?.trackingCode || order.orderCode;
      const info = await this.fetchOrderStatusFromViettel(trackingCode, token);
      if (!info) {
        // Chưa cắm API (stub) hoặc không lấy được → bỏ qua, không đụng đơn.
        skipped++;
        continue;
      }
      // TODO (khi cắm API): map info.ORDER_STATUS → OrderStatus, update nếu khác order.status.
      updated++;
    }

    return { candidates: orders.length, updated, skipped };
  }

  /** Lấy token API VTP từ StoreIntegration (cho outbound khi cắm API). */
  private async getViettelToken(): Promise<string | null> {
    const it = await this.prisma.storeIntegration.findFirst({
      where: { platform: 'VIETTELPOST', isActive: true },
      select: { accessToken: true },
    });
    return it?.accessToken || process.env.VIETTELPOST_TOKEN || null;
  }

  /**
   * STUB — gọi API tra cứu trạng thái đơn của ViettelPost (partner2).
   * Trả null cho đến khi có spec endpoint/method/param chính xác (endpoint v2 cũ đã 405).
   * Khi cắm: POST tới endpoint partner2 với header Token, trả về { ORDER_STATUS, STATUS_NAME, ... }.
   */
  private async fetchOrderStatusFromViettel(
    _trackingCode: string,
    _token: string | null,
  ): Promise<{ ORDER_STATUS: number } | null> {
    return null;
  }
}
