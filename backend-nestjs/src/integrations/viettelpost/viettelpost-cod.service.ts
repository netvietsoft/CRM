import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

const numOrNull = (v: any): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Đồng bộ TRẠNG THÁI THANH TOÁN COD (đối soát) của ViettelPost vào bảng `viettel_customers`.
 *
 * VTP KHÔNG đưa trạng thái đối soát COD qua API partner (`partner.viettelpost.vn/v2`) mà chỉ có ở
 * portal `viettelpost.vn` (host `api.viettelpost.vn/api/supperapp/get-list-order-by-status-v2`),
 * yêu cầu token WEB/SSO sinh từ phiên đăng nhập trình duyệt (FromSource:3). Backend KHÔNG tự mint được
 * token này (login bằng USER/PASS chỉ ra token MOBILE bị endpoint từ chối) → admin DÁN token vào CRM,
 * lưu ở SystemConfig key `VIETTEL_WEB_TOKEN`. Token hết hạn ~vài ngày → cần dán lại.
 *
 * Map `ORDER_NUMBER` (VTP) ↔ `trackingCode` (CRM) để ghi `codPayStatus` + `codPayStatusName`.
 * Giá trị COD_STATUS: KHONG_CO_COD | CHUA_NHAN_COD | CHO_NHAN_COD | DA_NHAN_COD.
 */
@Injectable()
export class ViettelpostCodService {
  private readonly logger = new Logger(ViettelpostCodService.name);
  private syncing = false;

  private readonly API = 'https://api.viettelpost.vn/api';
  private readonly TOKEN_KEY = 'VIETTEL_WEB_TOKEN';
  // Dải mã trạng thái "Tất cả" (lấy từ supperapp/get-list-status-category-code-v2, CODE=1).
  private readonly ALL_STATUS =
    '-100,-101,-102,-108,-109,-110,100,101,102,103,104,105,107,200,201,202,300,301,302,303,320,400,500,501,502,503,504,505,506,507,508,509,515,516,517,550,551,570';

  constructor(private readonly prisma: PrismaService) {}

  // ===== Token (admin dán từ trình duyệt viettelpost.vn) =====
  async getWebToken(): Promise<string | null> {
    const cfg = await this.prisma.systemConfig.findUnique({ where: { key: this.TOKEN_KEY } });
    const token = (cfg?.value as any)?.token;
    return typeof token === 'string' && token ? token : null;
  }

  async setWebToken(token: string): Promise<{ ok: boolean } & ReturnType<ViettelpostCodService['decodeToken']>> {
    const clean = (token || '').trim().replace(/^token\s+/i, '');
    if (!clean) return { ok: false, hasToken: false, expiresAt: null, expired: true };
    await this.prisma.systemConfig.upsert({
      where: { key: this.TOKEN_KEY },
      update: { value: { token: clean, savedAt: new Date().toISOString() } },
      create: { key: this.TOKEN_KEY, value: { token: clean, savedAt: new Date().toISOString() } },
    });
    return { ok: true, ...this.decodeToken(clean) };
  }

  /** Giải mã `exp` trong JWT để biết hạn (không verify chữ ký — chỉ đọc claim). */
  private decodeToken(token: string): { hasToken: boolean; expiresAt: string | null; expired: boolean } {
    try {
      const part = token.split('.')[1];
      const json = JSON.parse(Buffer.from(part, 'base64').toString('utf8'));
      const expMs = Number(json.exp) * 1000;
      if (!expMs) return { hasToken: true, expiresAt: null, expired: false };
      return { hasToken: true, expiresAt: new Date(expMs).toISOString(), expired: Date.now() > expMs };
    } catch {
      return { hasToken: true, expiresAt: null, expired: false };
    }
  }

  async tokenStatus(): Promise<{ hasToken: boolean; expiresAt: string | null; expired: boolean }> {
    const token = await this.getWebToken();
    if (!token) return { hasToken: false, expiresAt: null, expired: true };
    return this.decodeToken(token);
  }

  // ===== Gọi 1 trang danh sách đơn (kèm COD_STATUS) =====
  private async fetchPage(token: string, pageIndex: number, pageSize: number, from: string, to: string): Promise<any | null> {
    try {
      const res = await fetch(`${this.API}/supperapp/get-list-order-by-status-v2`, {
        method: 'POST',
        headers: { token, 'Content-Type': 'application/json', accept: 'application/json, text/plain, */*' },
        body: JSON.stringify({
          PAGE_INDEX: pageIndex,
          PAGE_SIZE: pageSize,
          INVENTORY: null,
          TYPE: 0,
          DATE_FROM: from,
          DATE_TO: to,
          ORDER_PROPERTIES: '',
          ORDER_PAYMENT: '',
          IS_FAST_DELIVERY: '',
          REASON_RETURN: null,
          ORDER_PAYMENT_TYPE: '',
          ORDER_STATUS: this.ALL_STATUS,
          COD_STATUS: null,
          SOURCE: 'WEB',
          deviceId: 'crm-sync',
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const json: any = await res.json().catch(() => null);
      return json;
    } catch (e: any) {
      this.logger.warn(`[VTP-COD] fetchPage lỗi: ${e?.message || e}`);
      return null;
    }
  }

  private fmtDate(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  /**
   * Đồng bộ COD_STATUS cho các đơn CRM có trong cửa sổ ngày (mặc định 180 ngày gần nhất).
   * Chỉ cập nhật dòng có `trackingCode` khớp `ORDER_NUMBER` từ VTP.
   */
  async syncCodStatuses(windowDays = 180): Promise<{ ok: boolean; total: number; updated: number; tokenExpired?: boolean; error?: string }> {
    const token = await this.getWebToken();
    if (!token) return { ok: false, total: 0, updated: 0, error: 'NO_TOKEN' };

    // trackingCode CRM cần khớp (bỏ nháp).
    const ours = await this.prisma.viettelCustomer.findMany({
      where: { trackingCode: { not: { startsWith: 'DRAFT-' } } },
      select: { trackingCode: true },
    });
    const wanted = new Set(ours.map((r) => r.trackingCode));
    if (wanted.size === 0) return { ok: true, total: 0, updated: 0 };

    const DAY_MS = 24 * 60 * 60 * 1000;
    const pageSize = 50;
    let total = 0;
    let updated = 0;
    const now = new Date();

    // VTP chỉ cho lọc tối đa 31 ngày/lần ("Chỉ cho phép lọc trong 31 ngày") → cắt thành khúc 30 ngày.
    for (let offset = 0; offset < windowDays; offset += 30) {
      const to = new Date(now.getTime() - offset * DAY_MS);
      const from = new Date(now.getTime() - Math.min(offset + 30, windowDays) * DAY_MS);
      let pageIndex = 1;

      while (pageIndex <= 40) {
        const json = await this.fetchPage(token, pageIndex, pageSize, this.fmtDate(from), this.fmtDate(to));
        if (!json) break;
        if (json.error) {
          if (json.messageKey === 'EXPIRED_TOKEN' || /hết hạn|đăng nhập/i.test(json.message || '')) {
            this.logger.warn('[VTP-COD] Token WEB hết hạn — cần dán lại token mới.');
            return { ok: false, total, updated, tokenExpired: true, error: 'EXPIRED_TOKEN' };
          }
          this.logger.warn(`[VTP-COD] VTP trả lỗi (${this.fmtDate(from)}→${this.fmtDate(to)} p${pageIndex}): ${json.message || JSON.stringify(json).slice(0, 200)}`);
          break;
        }
        const inner = json?.data?.data;
        const list: any[] = Array.isArray(inner?.LIST_ORDER) ? inner.LIST_ORDER : [];
        if (list.length === 0) break;
        total += list.length;

        for (const o of list) {
          const code = o?.ORDER_NUMBER;
          if (!code || !wanted.has(code)) continue;
          await this.prisma.viettelCustomer.updateMany({
            where: { trackingCode: code },
            data: {
              codPayStatus: o.COD_STATUS || null,
              codPayStatusName: o.COD_STATUS_NAME || null,
              codPaySyncedAt: now,
            },
          });
          updated++;
        }

        if (pageIndex * pageSize >= (Number(inner?.TOTAL) || 0)) break;
        pageIndex++;
      }
    }

    this.logger.log(`[VTP-COD] Sync COD_STATUS: ${updated}/${wanted.size} đơn cập nhật (đã quét ${total} đơn VTP).`);
    return { ok: true, total, updated };
  }

  /** Kick import lịch sử đơn (chạy NỀN — hàng nghìn đơn mất vài phút, Cloudflare cắt HTTP ~100s). */
  async startImportHistory(windowDays = 180): Promise<{ started: boolean; windowDays: number }> {
    const token = await this.getWebToken();
    if (!token) throw new BadRequestException('Chưa có token WEB — dán qua POST /viettelpost/cod-token trước.');
    void this.importHistory(windowDays)
      .then((r) => this.logger.log(`[VTP-IMPORT] Xong: quét ${r.scanned} đơn VTP → tạo mới ${r.created}, cập nhật ${r.updated}.`))
      .catch((e) => this.logger.error(`[VTP-IMPORT] Lỗi: ${(e as Error).message}`));
    return { started: true, windowDays };
  }

  /**
   * Import lịch sử đơn từ portal VTP về `viettel_customers`:
   * - Đơn CRM CHƯA có → tạo mới với dữ liệu list (người nhận, COD, dịch vụ, ngày gửi…).
   * - Đơn ĐÃ có → chỉ cập nhật trạng thái đối soát COD (webhook/reconcile là nguồn giàu hơn cho phần còn lại).
   */
  async importHistory(windowDays = 180): Promise<{ ok: boolean; scanned: number; created: number; updated: number; tokenExpired?: boolean; error?: string }> {
    const token = await this.getWebToken();
    if (!token) return { ok: false, scanned: 0, created: 0, updated: 0, error: 'NO_TOKEN' };

    const DAY_MS = 24 * 60 * 60 * 1000;
    const pageSize = 50;
    let scanned = 0;
    let created = 0;
    let updated = 0;
    const now = new Date();

    for (let offset = 0; offset < windowDays; offset += 30) {
      const to = new Date(now.getTime() - offset * DAY_MS);
      const from = new Date(now.getTime() - Math.min(offset + 30, windowDays) * DAY_MS);
      let pageIndex = 1;

      while (pageIndex <= 100) {
        const json = await this.fetchPage(token, pageIndex, pageSize, this.fmtDate(from), this.fmtDate(to));
        if (!json) break;
        if (json.error) {
          if (json.messageKey === 'EXPIRED_TOKEN' || /hết hạn|đăng nhập/i.test(json.message || '')) {
            this.logger.warn('[VTP-IMPORT] Token WEB hết hạn — cần dán lại token mới.');
            return { ok: false, scanned, created, updated, tokenExpired: true, error: 'EXPIRED_TOKEN' };
          }
          this.logger.warn(`[VTP-IMPORT] VTP trả lỗi (${this.fmtDate(from)}→${this.fmtDate(to)} p${pageIndex}): ${json.message || JSON.stringify(json).slice(0, 200)}`);
          break;
        }
        const inner = json?.data?.data;
        const list: any[] = Array.isArray(inner?.LIST_ORDER) ? inner.LIST_ORDER : [];
        if (list.length === 0) break;

        for (const o of list) {
          const code = o?.ORDER_NUMBER ? String(o.ORDER_NUMBER) : null;
          if (!code) continue;
          scanned++;
          const codFields = {
            codPayStatus: o.COD_STATUS || null,
            codPayStatusName: o.COD_STATUS_NAME || null,
            codPaySyncedAt: now,
          };
          const existing = await this.prisma.viettelCustomer.findUnique({ where: { trackingCode: code }, select: { id: true } });
          if (existing) {
            await this.prisma.viettelCustomer.update({ where: { id: existing.id }, data: codFields });
            updated++;
          } else {
            const sysDate = o.ORDER_SYSTEMDATE ? new Date(o.ORDER_SYSTEMDATE) : null;
            await this.prisma.viettelCustomer.create({
              data: {
                trackingCode: code,
                orderReference: o.ORDER_REFERENCE || null,
                status: numOrNull(o.ORDER_STATUS),
                statusDate: sysDate,
                sendDate: sysDate,
                receiverFullname: o.RECEIVER_FULLNAME || null,
                receiverPhone: o.RECEIVER_PHONE ? String(o.RECEIVER_PHONE) : null,
                receiverAddress: o.RECEIVER_ADDRESS || null,
                productName: o.PRODUCT_NAME || null,
                cod: numOrNull(o.MONEY_COLLECTION) ?? 0,
                moneyTotal: numOrNull(o.MONEY_TOTAL),
                orderService: o.ORDER_SERVICE || null,
                orderServiceAdd: o.ORDER_SERVICE_ADD || null,
                orderPayment: numOrNull(o.ORDER_PAYMENT),
                detailPayload: o,
                ...codFields,
              },
            });
            created++;
          }
        }

        if (pageIndex * pageSize >= (Number(inner?.TOTAL) || 0)) break;
        pageIndex++;
      }
    }

    this.logger.log(`[VTP-IMPORT] Quét ${scanned} đơn VTP → tạo mới ${created}, cập nhật COD ${updated}.`);
    return { ok: true, scanned, created, updated };
  }

  // Cron mỗi giờ — chỉ chạy nếu có token & chưa hết hạn.
  @Cron(process.env.VIETTEL_COD_SYNC_CRON || CronExpression.EVERY_HOUR, { name: 'viettelpost-cod-sync' })
  async handleCron() {
    if (process.env.VIETTEL_COD_SYNC === 'false') return;
    if (this.syncing) return;
    const status = await this.tokenStatus();
    if (!status.hasToken || status.expired) return;
    this.syncing = true;
    try {
      await this.syncCodStatuses();
    } catch (e: any) {
      this.logger.error(`[VTP-COD] Cron lỗi: ${e?.message || e}`);
    } finally {
      this.syncing = false;
    }
  }
}
