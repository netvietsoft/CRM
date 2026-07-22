import { Injectable, Logger } from '@nestjs/common';

const GRAPH = (process.env.META_GRAPH_URL || 'https://graph.facebook.com/v21.0').replace(/\/$/, '');

export class MetaAdsError extends Error {
  constructor(message: string, public code?: number, public httpStatus?: number) {
    super(message);
    this.name = 'MetaAdsError';
  }
}

/**
 * Client mỏng cho Meta Marketing API (Graph API).
 * Chỉ lo HTTP + phân trang; không biết DB. Token truyền vào theo từng call.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Ngưỡng quota app (x-app-usage %). Vượt 75% → sync tự nghỉ, NHƯỜNG quota cho Messenger Send API
// (chung 1 app — từng vượt 127% làm NV không gửi được tin cho khách).
const USAGE_SOFT_LIMIT = Number(process.env.META_ADS_USAGE_SOFT_LIMIT || 75);

@Injectable()
export class MetaAdsClient {
  private readonly logger = new Logger(MetaAdsClient.name);
  private pausedUntil = 0; // epoch ms — đang nhường quota

  /** Đọc x-app-usage; quota cao → tạm dừng sync 5 phút (không chặn call hiện tại). */
  private trackUsage(res: Response): void {
    try {
      const raw = res.headers.get('x-app-usage');
      if (!raw) return;
      const u = JSON.parse(raw);
      const pct = Math.max(Number(u.call_count) || 0, Number(u.total_time) || 0, Number(u.total_cputime) || 0);
      if (pct >= USAGE_SOFT_LIMIT) {
        this.pausedUntil = Date.now() + 5 * 60_000;
        this.logger.warn(`[MetaAds] App usage ${pct}% ≥ ${USAGE_SOFT_LIMIT}% — sync nghỉ 5 phút nhường quota cho Messenger.`);
      }
    } catch { /* header lạ — bỏ qua */ }
  }

  private async waitTurn(): Promise<void> {
    while (Date.now() < this.pausedUntil) await sleep(15_000);
    await sleep(300); // giãn nhịp giữa các call — sync chậm hơn chút nhưng không nuốt quota
  }

  private async getRaw(path: string, params: Record<string, string>, token: string): Promise<any> {
    await this.waitTurn();
    const qs = new URLSearchParams({ ...params, access_token: token }).toString();
    const url = `${GRAPH}/${path.replace(/^\//, '')}?${qs}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    this.trackUsage(res);
    const json: any = await res.json().catch(() => null);
    if (!res.ok) {
      const err = json?.error;
      if (err?.code === 4) {
        // (#4) đã chạm trần app — dừng hẳn 10 phút, tránh giành giật với Send API.
        this.pausedUntil = Date.now() + 10 * 60_000;
        this.logger.warn('[MetaAds] (#4) chạm trần quota app — sync nghỉ 10 phút.');
      }
      throw new MetaAdsError(err?.message || `HTTP ${res.status}`, err?.code, res.status);
    }
    return json;
  }

  /** Lấy 1 node (object) theo fields. */
  async getNode(id: string, fields: string, token: string): Promise<any> {
    return this.getRaw(id, { fields }, token);
  }

  /**
   * Lấy TẤT CẢ trang của 1 edge (gộp `data[]`). Theo `paging.next` (URL tuyệt đối, đã kèm cursor + token).
   * `maxPages` chặn vòng lặp vô hạn; log nếu chạm trần.
   */
  async getEdge(path: string, params: Record<string, string>, token: string, maxPages = 200): Promise<any[]> {
    const out: any[] = [];
    let json = await this.getRaw(path, { limit: '500', ...params }, token);
    let pages = 0;
    while (json) {
      if (Array.isArray(json.data)) out.push(...json.data);
      const next: string | undefined = json?.paging?.next;
      if (!next) break;
      if (++pages >= maxPages) {
        this.logger.warn(`[MetaAds] Chạm trần ${maxPages} trang ở ${path} — có thể còn dữ liệu chưa kéo.`);
        break;
      }
      await this.waitTurn();
      const res = await fetch(next, { signal: AbortSignal.timeout(30_000) });
      this.trackUsage(res);
      json = await res.json().catch(() => null);
      if (!res.ok) {
        this.logger.warn(`[MetaAds] Lỗi phân trang ${path}: HTTP ${res.status}`);
        break;
      }
    }
    return out;
  }
}
