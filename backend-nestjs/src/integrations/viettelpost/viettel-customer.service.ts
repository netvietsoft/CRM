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

  /** Liệt kê cho trang admin "Khách hàng Viettel" — có bộ lọc. */
  async listCustomers(q: {
    search?: string; // người nhận / mã vận đơn / SĐT
    productName?: string;
    status?: string | number;
    codMin?: string | number;
    codMax?: string | number;
    dateFrom?: string;
    dateTo?: string;
  } = {}) {
    const where: any = {};
    const search = (q.search || '').trim();
    if (search) {
      where.OR = [
        { receiverFullname: { contains: search } },
        { trackingCode: { contains: search } },
        { receiverPhone: { contains: search } },
      ];
    }
    if (q.productName?.trim()) where.productName = { contains: q.productName.trim() };
    if (q.status !== undefined && q.status !== '' && q.status !== null) {
      const st = Number(q.status);
      if (!Number.isNaN(st)) where.status = st;
    }
    const codMin = q.codMin !== undefined && q.codMin !== '' ? Number(q.codMin) : undefined;
    const codMax = q.codMax !== undefined && q.codMax !== '' ? Number(q.codMax) : undefined;
    if (codMin !== undefined || codMax !== undefined) {
      where.cod = {};
      if (codMin !== undefined && !Number.isNaN(codMin)) where.cod.gte = codMin;
      if (codMax !== undefined && !Number.isNaN(codMax)) where.cod.lte = codMax;
    }
    if (q.dateFrom || q.dateTo) {
      where.createdAt = {};
      if (q.dateFrom) where.createdAt.gte = new Date(`${q.dateFrom}T00:00:00`);
      if (q.dateTo) where.createdAt.lte = new Date(`${q.dateTo}T23:59:59.999`);
    }
    return this.prisma.viettelCustomer.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 1000 });
  }

  /** Danh sách trạng thái (mã + tên) đang có trong bảng — cho dropdown lọc. */
  async listStatuses() {
    const rows = await this.prisma.viettelCustomer.groupBy({
      by: ['status', 'statusName'],
      _count: { _all: true },
    });
    return rows
      .filter((r) => r.status != null)
      .map((r) => ({ status: r.status, statusName: r.statusName, count: r._count._all }))
      .sort((a, b) => (a.status || 0) - (b.status || 0));
  }

  /**
   * Tạo vận đơn MỚI trên ViettelPost (order/createOrder, theo ID địa chỉ) rồi lưu vào viettel_customers.
   * Người gửi lấy từ env VIETTELPOST_SENDER_*. Trả { trackingCode, fee } hoặc { error }.
   */
  async createOnVtp(dto: {
    // Người gửi (override; mặc định lấy env VIETTELPOST_SENDER_*; địa điểm ID luôn từ env)
    senderFullname?: string;
    senderPhone?: string;
    senderAddress?: string;
    // Người nhận
    receiverFullname: string;
    receiverPhone: string;
    receiverAddress: string;
    receiverProvince: number;
    receiverDistrict: number;
    receiverWard?: number;
    // Hàng hóa
    productType?: string; // 'HH' bưu kiện | 'TaiLieu' tài liệu
    items?: Array<{ name?: string; quantity?: number; weight?: number; price?: number }>;
    productLength?: number;
    productWidth?: number;
    productHeight?: number;
    orderReference?: string; // mã đơn tự tạo
    // Tiền / dịch vụ
    cod: number;
    orderPayment?: number;
    orderService: string;
    serviceAdd?: string[] | string; // mã dịch vụ cộng thêm (XMG, HDV, HGC...)
    orderNote?: string;
  }): Promise<{ trackingCode?: string; fee?: number; error?: string }> {
    const items =
      dto.items && dto.items.length
        ? dto.items
        : [{ name: 'Hàng hóa', quantity: 1, weight: 500, price: 0 }];
    const listItem = items.map((it) => ({
      PRODUCT_NAME: it.name || 'Hàng hóa',
      PRODUCT_PRICE: Number(it.price) || 0,
      PRODUCT_WEIGHT: Number(it.weight) || 0,
      PRODUCT_QUANTITY: Number(it.quantity) || 1,
    }));
    const totalWeight = listItem.reduce((s, i) => s + i.PRODUCT_WEIGHT * (i.PRODUCT_QUANTITY || 1), 0);
    const totalPrice = listItem.reduce((s, i) => s + i.PRODUCT_PRICE * (i.PRODUCT_QUANTITY || 1), 0);
    const totalQty = listItem.reduce((s, i) => s + i.PRODUCT_QUANTITY, 0);
    const productName = items.map((i) => i.name).filter(Boolean).join(', ') || 'Hàng hóa';
    const serviceAdd = Array.isArray(dto.serviceAdd)
      ? dto.serviceAdd.filter(Boolean).join(',')
      : dto.serviceAdd || '';

    const payload: Record<string, any> = {
      ORDER_NUMBER: dto.orderReference || '',
      GROUPADDRESS_ID: 0,
      CUS_ID: 0,
      SENDER_FULLNAME: dto.senderFullname || process.env.VIETTELPOST_SENDER_NAME || 'Shop',
      SENDER_PHONE: dto.senderPhone || process.env.VIETTELPOST_SENDER_PHONE || '',
      SENDER_ADDRESS: dto.senderAddress || process.env.VIETTELPOST_SENDER_ADDRESS || '',
      SENDER_PROVINCE: Number(process.env.VIETTELPOST_SENDER_PROVINCE) || 1,
      SENDER_DISTRICT: Number(process.env.VIETTELPOST_SENDER_DISTRICT) || 14,
      SENDER_WARD: Number(process.env.VIETTELPOST_SENDER_WARD) || 0,
      RECEIVER_FULLNAME: dto.receiverFullname,
      RECEIVER_PHONE: dto.receiverPhone,
      RECEIVER_ADDRESS: dto.receiverAddress,
      RECEIVER_PROVINCE: dto.receiverProvince,
      RECEIVER_DISTRICT: dto.receiverDistrict,
      RECEIVER_WARD: dto.receiverWard ?? 0,
      PRODUCT_NAME: productName,
      PRODUCT_DESCRIPTION: productName,
      PRODUCT_QUANTITY: totalQty,
      PRODUCT_PRICE: totalPrice,
      PRODUCT_WEIGHT: totalWeight,
      PRODUCT_TYPE: dto.productType || 'HH',
      PRODUCT_LENGTH: Number(dto.productLength) || 0,
      PRODUCT_WIDTH: Number(dto.productWidth) || 0,
      PRODUCT_HEIGHT: Number(dto.productHeight) || 0,
      ORDER_PAYMENT: dto.orderPayment ?? 3,
      ORDER_SERVICE: dto.orderService,
      ORDER_SERVICE_ADD: serviceAdd,
      ORDER_VOUCHER: '',
      ORDER_NOTE: dto.orderNote || '',
      MONEY_COLLECTION: dto.cod || 0,
      MONEY_TOTALFEE: 0,
      MONEY_FEECOD: 0,
      MONEY_OTHERFEE: 0,
      MONEY_VAS: 0,
      MONEY_VAT: 0,
      MONEY_TOTAL: 0,
      MONEY_TOTALVAT: 0,
      LIST_ITEM: listItem,
    };

    const res = await this.authService.post('order/createOrder', payload);
    const data = res?.data;
    const trackingCode = data?.ORDER_NUMBER;
    if (!res || res.error === true || !trackingCode) {
      return { error: res?.message || 'ViettelPost từ chối tạo đơn (kiểm tra địa chỉ/dịch vụ).' };
    }

    const saveData = {
      receiverFullname: dto.receiverFullname,
      receiverPhone: dto.receiverPhone,
      receiverAddress: dto.receiverAddress,
      receiverProvinceId: dto.receiverProvince,
      receiverDistrictId: dto.receiverDistrict,
      receiverWardId: dto.receiverWard ?? null,
      productName,
      cod: dto.cod || 0,
      orderNote: dto.orderNote || null,
      orderService: dto.orderService,
      orderReference: dto.orderReference || null,
      productWeight: totalWeight,
      status: 100,
      statusName: 'Tạo đơn',
      detailPayload: data,
    };
    try {
      await this.prisma.viettelCustomer.upsert({
        where: { trackingCode: String(trackingCode) },
        update: saveData,
        create: { trackingCode: String(trackingCode), ...saveData },
      });
    } catch (e: any) {
      this.logger.warn(`[VTP] tạo đơn OK nhưng lưu DB lỗi: ${e?.message || e}`);
    }

    return { trackingCode: String(trackingCode), fee: Number(data?.MONEY_TOTAL || 0) };
  }

  /**
   * Gọi order/UpdateOrder để cập nhật trạng thái vận đơn theo TYPE.
   * TYPE: 1 Duyệt · 2 Duyệt hoàn (505) · 3 Phát tiếp (505) · 4 Hủy (status<200) · 5 Gửi lại · 11 Xóa đơn đã hủy (107).
   */
  async updateStatus(
    trackingCode: string,
    type: number,
    note?: string,
  ): Promise<{ ok: boolean; message: string }> {
    await this.getOne(trackingCode); // đảm bảo đơn tồn tại
    const res = await this.authService.post('order/UpdateOrder', {
      ORDER_NUMBER: trackingCode,
      TYPE: type,
      NOTE: note || '',
    });
    const ok = !!res && (res.status === 200 || res.error === false);
    return {
      ok,
      message: ok ? 'ViettelPost đã nhận yêu cầu.' : `VTP từ chối/không phản hồi: ${res?.message || 'lỗi không rõ'}`,
    };
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
