import { Injectable, Logger } from '@nestjs/common';

const GRAPH = (process.env.META_GRAPH_URL || 'https://graph.facebook.com/v21.0').replace(/\/$/, '');

export interface SendPayload {
  text?: string;
  attachmentUrl?: string;
}

/**
 * Client mỏng cho Meta Messenger / Graph API. Chỉ lo HTTP; token truyền vào theo từng call.
 * sendMessage/getProfile/subscribeApp/fetch* — page access token; fetchManagedPages — user/system token.
 */
@Injectable()
export class MetaMessengerClient {
  private readonly logger = new Logger(MetaMessengerClient.name);

  private async call(path: string, init: RequestInit, token: string): Promise<any> {
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(`${GRAPH}/${path}${sep}access_token=${encodeURIComponent(token)}`, {
      ...init,
      signal: AbortSignal.timeout(30_000),
    });
    const json: any = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);
    return json;
  }

  /** Gửi tin tới khách (PSID) bằng page token. */
  async sendMessage(pageToken: string, recipientPsid: string, payload: SendPayload): Promise<{ message_id: string }> {
    const message = payload.attachmentUrl
      ? { attachment: { type: 'image', payload: { url: payload.attachmentUrl, is_reusable: true } } }
      : { text: payload.text };
    return this.call(
      'me/messages',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ recipient: { id: recipientPsid }, message, messaging_type: 'RESPONSE' }),
      },
      pageToken,
    );
  }

  /** Gửi LỜI MỜI nhận tin tiếp thị (template notification_messages) — khách bấm đồng ý → webhook optin trả token. */
  async sendOptinRequest(pageToken: string, recipientPsid: string, title: string, imageUrl?: string): Promise<{ message_id: string }> {
    return this.call(
      'me/messages',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientPsid },
          message: {
            attachment: {
              type: 'template',
              payload: {
                template_type: 'notification_messages',
                title: title.slice(0, 65),
                ...(imageUrl ? { image_url: imageUrl } : {}),
                notification_messages_reoptin: 'ENABLE',
              },
            },
          },
        }),
      },
      pageToken,
    );
  }

  /** Gửi tin TIẾP THỊ tới khách đã opt-in (recipient = notification_messages_token, ngoài cửa sổ 24h). */
  async sendMarketingMessage(pageToken: string, notifToken: string, text: string): Promise<{ message_id: string }> {
    return this.call(
      'me/messages',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ recipient: { notification_messages_token: notifToken }, message: { text } }),
      },
      pageToken,
    );
  }

  /** Hồ sơ công khai của khách theo PSID (name, ảnh). Lỗi/thiếu quyền → {error} để nơi gọi log được lý do thật. */
  async getProfile(pageToken: string, psid: string): Promise<{ name?: string; profile_pic?: string; error?: string }> {
    let err: string | undefined;
    const p: any = await this.call(`${psid}?fields=name,profile_pic`, { method: 'GET' }, pageToken).catch((e) => {
      err = e instanceof Error ? e.message : String(e);
      return {};
    });
    if (!p?.profile_pic) {
      // Fallback: edge /picture (quyền khác field profile_pic) — trả URL CDN dùng được không cần token.
      const pic: any = await this.call(`${psid}/picture?redirect=false&width=200`, { method: 'GET' }, pageToken).catch((e) => {
        err = err || (e instanceof Error ? e.message : String(e));
        return null;
      });
      if (pic?.data?.url && !pic?.data?.is_silhouette) p.profile_pic = pic.data.url;
      else if (pic?.data?.is_silhouette) err = err || 'is_silhouette (khách không có ảnh công khai)';
    }
    if (err) p.error = err;
    return p;
  }

  /** Đăng ký app nhận webhook cho page. */
  async subscribeApp(pageToken: string, pageId: string): Promise<boolean> {
    const r = await this.call(
      `${pageId}/subscribed_apps`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subscribed_fields: ['messages', 'messaging_postbacks', 'message_echoes'] }),
      },
      pageToken,
    ).catch((e) => {
      this.logger.warn(`subscribe ${pageId}: ${(e as Error).message}`);
      return null;
    });
    return !!r?.success;
  }

  /** Page user/system token quản lý + page access token + tasks (để đăng ký MsgPage). */
  async fetchManagedPages(userToken: string): Promise<any[]> {
    return this.getEdge('me/accounts?fields=id,name,access_token,tasks,category&limit=100', userToken);
  }

  async fetchConversations(pageToken: string, pageId: string): Promise<any[]> {
    return this.getEdge(`${pageId}/conversations?fields=id,participants,updated_time,unread_count&limit=50`, pageToken);
  }

  async fetchMessages(pageToken: string, conversationId: string): Promise<any[]> {
    return this.getEdge(`${conversationId}/messages?fields=id,message,from,to,created_time,attachments{id,mime_type,name,file_url,image_data,video_data}&limit=50`, pageToken);
  }

  /** Bài viết đã đăng của page (cần quyền pages_read_engagement). */
  async fetchPagePosts(pageToken: string, pageId: string): Promise<any[]> {
    return this.getEdge(
      `${pageId}/published_posts?fields=id,message,created_time,full_picture,permalink_url,shares,likes.summary(true),comments.summary(true)&limit=25`,
      pageToken,
      3,
    );
  }

  /** Lấy mọi trang của 1 edge theo paging.next. */
  private async getEdge(path: string, token: string, max = 20): Promise<any[]> {
    const out: any[] = [];
    let url: string | null = `${GRAPH}/${path}${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`;
    for (let i = 0; i < max && url; i++) {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      const j: any = await res.json().catch(() => null);
      if (!res.ok) break;
      if (Array.isArray(j?.data)) out.push(...j.data);
      url = j?.paging?.next || null;
    }
    return out;
  }
}
