import { Injectable, Logger } from '@nestjs/common';

/**
 * Xác thực ViettelPost Partner: Login (USERNAME/PASSWORD) → token, cache theo `expired`,
 * tự re-login khi sắp/đã hết hạn. Token dùng cho mọi call outbound (header `Token`).
 *
 * Env:
 *  - VIETTELPOST_API_URL  (mặc định https://partner.viettelpost.vn/v2)
 *  - VIETTELPOST_USERNAME / VIETTELPOST_PASSWORD
 */
@Injectable()
export class ViettelpostAuthService {
  private readonly logger = new Logger(ViettelpostAuthService.name);
  private cachedToken: string | null = null;
  private expiresAtMs = 0;
  private inflight: Promise<string | null> | null = null;

  get apiUrl(): string {
    return (process.env.VIETTELPOST_API_URL || 'https://partner.viettelpost.vn/v2').replace(/\/$/, '');
  }

  /** Token còn hạn (cache) hoặc đăng nhập mới. Trả null nếu thiếu cred / login lỗi. */
  async getToken(): Promise<string | null> {
    const now = Date.now();
    // còn hạn (trừ buffer 60s)
    if (this.cachedToken && now < this.expiresAtMs - 60_000) return this.cachedToken;
    // gộp các request đồng thời vào 1 lần login
    if (this.inflight) return this.inflight;
    this.inflight = this.login().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async login(): Promise<string | null> {
    const username = process.env.VIETTELPOST_USERNAME;
    const password = process.env.VIETTELPOST_PASSWORD;
    if (!username || !password) {
      this.logger.warn('[VTP] Thiếu VIETTELPOST_USERNAME/PASSWORD — không lấy được token.');
      return null;
    }
    try {
      const res = await fetch(`${this.apiUrl}/user/Login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ USERNAME: username, PASSWORD: password }),
        signal: AbortSignal.timeout(15_000),
      });
      const json: any = await res.json().catch(() => null);
      const token = json?.data?.token;
      if (!res.ok || !token) {
        this.logger.error(`[VTP] Login thất bại: HTTP ${res.status} ${json?.message || ''}`);
        this.cachedToken = null;
        return null;
      }
      this.cachedToken = token;
      // `expired` là epoch ms; fallback 12h nếu không có.
      this.expiresAtMs = Number(json?.data?.expired) || Date.now() + 12 * 60 * 60 * 1000;
      this.logger.log(`[VTP] Login OK (token hết hạn ~${new Date(this.expiresAtMs).toISOString()}).`);
      return this.cachedToken;
    } catch (e: any) {
      this.logger.error(`[VTP] Login lỗi: ${e?.message || e}`);
      this.cachedToken = null;
      return null;
    }
  }

  /** POST một endpoint VTP có kèm token (dùng cho order/edit, UpdateOrder...). Trả JSON hoặc null. */
  async post(path: string, body: any): Promise<any | null> {
    const token = await this.getToken();
    if (!token) return null;
    try {
      const res = await fetch(`${this.apiUrl}/${path.replace(/^\//, '')}`, {
        method: 'POST',
        headers: { Token: token, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) this.logger.warn(`[VTP] POST ${path} → HTTP ${res.status} ${JSON.stringify(json)?.slice(0, 200)}`);
      return json;
    } catch (e: any) {
      this.logger.warn(`[VTP] POST ${path} lỗi: ${e?.message || e}`);
      return null;
    }
  }

  /** GET trên host v3 (địa danh hệ MỚI sau 1/7/2025: categories/listProvinceNew, listWardsNew). */
  async getV3(pathWithQuery: string): Promise<any | null> {
    const token = await this.getToken();
    if (!token) return null;
    const base = this.apiUrl.replace(/\/v2$/, '/v3');
    try {
      const res = await fetch(`${base}/${pathWithQuery.replace(/^\//, '')}`, {
        method: 'GET',
        headers: { Token: token, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        this.logger.warn(`[VTP] GET(v3) ${pathWithQuery} → HTTP ${res.status}`);
        return null;
      }
      return await res.json().catch(() => null);
    } catch (e: any) {
      this.logger.warn(`[VTP] GET(v3) ${pathWithQuery} lỗi: ${e?.message || e}`);
      return null;
    }
  }

  /** GET một endpoint VTP có kèm token (dùng cho detail-v2, list...). Trả JSON hoặc null. */
  async get(pathWithQuery: string): Promise<any | null> {
    const token = await this.getToken();
    if (!token) return null;
    try {
      const res = await fetch(`${this.apiUrl}/${pathWithQuery.replace(/^\//, '')}`, {
        method: 'GET',
        headers: { Token: token, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        this.logger.warn(`[VTP] GET ${pathWithQuery} → HTTP ${res.status}`);
        return null;
      }
      return await res.json().catch(() => null);
    } catch (e: any) {
      this.logger.warn(`[VTP] GET ${pathWithQuery} lỗi: ${e?.message || e}`);
      return null;
    }
  }
}
