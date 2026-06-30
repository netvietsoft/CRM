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
@Injectable()
export class MetaAdsClient {
  private readonly logger = new Logger(MetaAdsClient.name);

  private async getRaw(path: string, params: Record<string, string>, token: string): Promise<any> {
    const qs = new URLSearchParams({ ...params, access_token: token }).toString();
    const url = `${GRAPH}/${path.replace(/^\//, '')}?${qs}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    const json: any = await res.json().catch(() => null);
    if (!res.ok) {
      const err = json?.error;
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
      const res = await fetch(next, { signal: AbortSignal.timeout(30_000) });
      json = await res.json().catch(() => null);
      if (!res.ok) {
        this.logger.warn(`[MetaAds] Lỗi phân trang ${path}: HTTP ${res.status}`);
        break;
      }
    }
    return out;
  }
}
