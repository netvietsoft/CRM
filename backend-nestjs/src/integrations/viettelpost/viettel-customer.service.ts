import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ViettelpostAuthService } from './viettelpost-auth.service';

/**
 * Ghi nhận đơn/khách ViettelPost vào bảng riêng `viettel_customers` (1 dòng / mã vận đơn).
 * Upsert mỗi webhook: cập nhật trạng thái mới nhất + toàn bộ field + tích luỹ lịch sử hành trình + lưu payload thô.
 * Bổ trợ cho Order (source=VIETTEL) — KHÔNG thay thế.
 */
@Injectable()
export class ViettelCustomerService {
  private readonly logger = new Logger(ViettelCustomerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: ViettelpostAuthService,
  ) {}

  /** Parse ngày VTP "dd/MM/yyyy HH:mm:ss" (hoặc ISO) → Date; null nếu không parse được. */
  private parseDate(value?: string | null): Date | null {
    if (!value) return null;
    const iso = new Date(value);
    if (!Number.isNaN(iso.getTime())) return iso;
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/.exec(
      value.trim(),
    );
    if (m) {
      const [, d, mo, y, h = '0', mi = '0', s = '0'] = m;
      const dt = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
      return Number.isNaN(dt.getTime()) ? null : dt;
    }
    return null;
  }

  private num(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }

  /** Upsert 1 dòng theo trackingCode từ payload webhook VTP. Không bao giờ throw (bổ trợ). */
  async upsertFromWebhook(payload: any, storeId?: string | null): Promise<void> {
    try {
      const d = payload?.DATA || {};
      const trackingCode = d.ORDER_NUMBER;
      if (!trackingCode) return;

      const statusDate = this.parseDate(d.ORDER_STATUSDATE);
      const location = d.LOCATION_CURRENTLY || d.LOCALION_CURRENTLY || null;

      // Tích luỹ lịch sử hành trình (dedup theo status + thời điểm).
      const existing = await this.prisma.viettelCustomer.findUnique({
        where: { trackingCode },
        select: { courierHistory: true },
      });
      const history: any[] = Array.isArray(existing?.courierHistory)
        ? (existing!.courierHistory as any[])
        : [];
      const entry = {
        status: this.num(d.ORDER_STATUS),
        statusName: d.STATUS_NAME || null,
        note: d.NOTE || null,
        location,
        at: statusDate?.toISOString() || new Date().toISOString(),
      };
      const dup = history.some(
        (h) => h.status === entry.status && h.at === entry.at,
      );
      if (!dup) history.push(entry);

      const data = {
        orderReference: d.ORDER_REFERENCE || null,
        status: this.num(d.ORDER_STATUS),
        statusName: d.STATUS_NAME || null,
        statusDate,
        receiverFullname: d.RECEIVER_FULLNAME || null,
        cod: this.num(d.MONEY_COLLECTION) ?? 0,
        codOrigin: this.num(d.MONEY_COLLECTION_ORIGIN),
        moneyTotal: this.num(d.MONEY_TOTAL),
        moneyTotalFee: this.num(d.MONEY_TOTALFEE),
        moneyTotalVat: this.num(d.MONEY_TOTALVAT),
        moneyFeeCod: this.num(d.MONEY_FEECOD),
        voucherValue: this.num(d.VOUCHER_VALUE),
        productWeight: this.num(d.PRODUCT_WEIGHT),
        orderService: d.ORDER_SERVICE || null,
        orderServiceAdd: d.ORDER_SERVICE_ADD || null,
        orderPayment: this.num(d.ORDER_PAYMENT),
        expectedDelivery: d.EXPECTED_DELIVERY || null,
        expectedDeliveryDate: d.EXPECTED_DELIVERY_DATE || null,
        note: d.NOTE || null,
        orderNote: d.ORDER_NOTE || null,
        locationCurrently: location,
        employeeName: d.EMPLOYEE_NAME || null,
        employeePhone: d.EMPLOYEE_PHONE || null,
        isReturning: Boolean(d.IS_RETURNING),
        reasonCode: d.REASON_CODE ? String(d.REASON_CODE) : null,
        groupAddressId: d.GROUPADDRESS_ID != null ? String(d.GROUPADDRESS_ID) : null,
        detail: d.DETAIL ?? undefined,
        pod: d.POD ?? undefined,
        courierHistory: history,
        rawPayload: payload ?? undefined,
        storeId: storeId || null,
      };

      await this.prisma.viettelCustomer.upsert({
        where: { trackingCode },
        update: data,
        create: { trackingCode, ...data },
      });
    } catch (e: any) {
      this.logger.warn(`[VTP] upsert viettel_customers lỗi (bỏ qua): ${e?.message || e}`);
    }
  }

  /**
   * Bồi (enrich) 1 dòng từ dữ liệu order/detail-v2 (có SĐT + địa chỉ + tên SP mà webhook không gửi).
   * Chỉ cập nhật field còn thiếu/quan trọng; không tạo dòng mới (đã có từ webhook).
   */
  async enrichFromDetail(trackingCode: string, detail: any): Promise<void> {
    if (!trackingCode || !detail) return;
    try {
      const homeNo = detail.RECEIVER_HOME_NO || detail.RECEIVER_ADDRESS || null;
      await this.prisma.viettelCustomer.updateMany({
        where: { trackingCode },
        data: {
          receiverFullname: detail.RECEIVER_FULLNAME || undefined,
          receiverPhone: detail.RECEIVER_PHONE ? String(detail.RECEIVER_PHONE) : undefined,
          receiverAddress: homeNo || undefined,
          receiverProvinceId: this.num(detail.RECEIVER_PROVINCE) ?? undefined,
          receiverDistrictId: this.num(detail.RECEIVER_DISTRICT) ?? undefined,
          receiverWardId: this.num(detail.RECEIVER_WARD) ?? undefined,
          productName: detail.PRODUCT_NAME || undefined,
          cod: this.num(detail.MONEY_COLLECTION) ?? undefined,
          detailPayload: detail,
          detailEnrichedAt: new Date(),
        },
      });
    } catch (e: any) {
      this.logger.warn(`[VTP] enrich ${trackingCode} lỗi (bỏ qua): ${e?.message || e}`);
    }
  }

  /** Liệt kê cho trang admin "Khách hàng Viettel". */
  async listCustomers() {
    return this.prisma.viettelCustomer.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  /** Chi tiết 1 khách/đơn theo mã vận đơn. */
  async getOne(trackingCode: string) {
    const row = await this.prisma.viettelCustomer.findUnique({ where: { trackingCode } });
    if (!row) throw new NotFoundException('Không tìm thấy đơn ViettelPost');
    return row;
  }

  /**
   * Sửa thông tin + đẩy lên ViettelPost (order/edit). Luôn lưu CRM; chỉ đẩy VTP khi đơn CHƯA lấy hàng
   * (ORDER_STATUS < 200) — VTP không cho sửa đơn đã vào khai thác. Trả kết quả cả 2 phía.
   */
  async editAndPush(
    trackingCode: string,
    dto: {
      receiverFullname?: string;
      receiverPhone?: string;
      receiverAddress?: string;
      orderNote?: string;
      cod?: number;
    },
  ): Promise<{ local: 'updated'; vtp: { pushed: boolean; message: string } }> {
    const row = await this.getOne(trackingCode);

    // Lưu CRM trước (luôn thành công).
    await this.prisma.viettelCustomer.update({
      where: { trackingCode },
      data: {
        receiverFullname: dto.receiverFullname ?? undefined,
        receiverPhone: dto.receiverPhone ?? undefined,
        receiverAddress: dto.receiverAddress ?? undefined,
        orderNote: dto.orderNote ?? undefined,
        cod: dto.cod ?? undefined,
      },
    });

    // Đẩy VTP chỉ khi status < 200 (chưa lấy hàng).
    if (row.status != null && row.status >= 200) {
      return {
        local: 'updated',
        vtp: { pushed: false, message: `Đơn đã vào khai thác (status ${row.status}) — ViettelPost không cho sửa.` },
      };
    }

    const payload: Record<string, any> = {
      ORDER_NUMBER: trackingCode,
      RECEIVER_FULLNAME: dto.receiverFullname ?? row.receiverFullname,
      RECEIVER_PHONE: dto.receiverPhone ?? row.receiverPhone,
      RECEIVER_ADDRESS: dto.receiverAddress ?? row.receiverAddress,
      RECEIVER_PROVINCE: row.receiverProvinceId,
      RECEIVER_DISTRICT: row.receiverDistrictId,
      RECEIVER_WARD: row.receiverWardId,
      ORDER_NOTE: dto.orderNote ?? row.orderNote,
      MONEY_COLLECTION: dto.cod ?? row.cod,
      PRODUCT_NAME: row.productName,
      PRODUCT_WEIGHT: row.productWeight,
    };
    const res = await this.authService.post('order/edit', payload);
    const ok = res && (res.status === 200 || res.error === false);
    return {
      local: 'updated',
      vtp: {
        pushed: !!ok,
        message: ok ? 'Đã đẩy cập nhật lên ViettelPost.' : `VTP từ chối/không phản hồi: ${res?.message || 'lỗi không rõ'}`,
      },
    };
  }
}
