import { Injectable, Logger } from '@nestjs/common';

const GRAPH = (process.env.META_GRAPH_URL || 'https://graph.facebook.com/v19.0').replace(/\/$/, '');

/** Client OAuth Facebook: đổi code → token, gia hạn long-lived, đọc Graph. HTTP thuần. */
@Injectable()
export class FacebookOAuthClient {
  private readonly logger = new Logger(FacebookOAuthClient.name);

  private appId = () => process.env.META_APP_ID || '';
  private appSecret = () => process.env.META_APP_SECRET || '';
  private redirectUri = () => process.env.META_OAUTH_REDIRECT_URI || '';

  private async getJson(url: string): Promise<any> {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    const json: any = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);
    return json;
  }

  /** code (từ callback) → short-lived user token. */
  async exchangeCode(code: string): Promise<string> {
    const qs = new URLSearchParams({
      client_id: this.appId(),
      redirect_uri: this.redirectUri(),
      client_secret: this.appSecret(),
      code,
    });
    const j = await this.getJson(`${GRAPH}/oauth/access_token?${qs}`);
    return j.access_token;
  }

  /** short/long token → long-lived (~60 ngày). */
  async toLongLived(token: string): Promise<{ token: string; expiresInSec: number | null }> {
    const qs = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.appId(),
      client_secret: this.appSecret(),
      fb_exchange_token: token,
    });
    const j = await this.getJson(`${GRAPH}/oauth/access_token?${qs}`);
    return { token: j.access_token, expiresInSec: j.expires_in ?? null };
  }

  async getNode(id: string, fields: string, token: string): Promise<any> {
    return this.getJson(`${GRAPH}/${id}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(token)}`);
  }

  /** Lấy mọi trang của 1 edge (gộp data[]). */
  async getEdge(path: string, params: Record<string, string>, token: string, maxPages = 50): Promise<any[]> {
    const out: any[] = [];
    let url: string | null = `${GRAPH}/${path}?${new URLSearchParams({ limit: '200', ...params, access_token: token })}`;
    for (let i = 0; i < maxPages && url; i++) {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      const j: any = await res.json().catch(() => null);
      if (!res.ok) {
        this.logger.warn(`[FB] getEdge ${path}: ${j?.error?.message || res.status}`);
        break;
      }
      if (Array.isArray(j?.data)) out.push(...j.data);
      url = j?.paging?.next || null;
    }
    return out;
  }
}
