# Messenger Inbox (chat với khách của Page) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho nhân viên nhận & trả lời tin nhắn Messenger 1-1 của khách nhắn vào Fanpage, ngay trong CRM, real-time (v1: 1 page test, webhook).

**Architecture:** Module NestJS `messenger` mới: webhook nhận tin (verify chữ ký) → upsert Conversation/Message → emit WebSocket (gateway `admin-notifications` sẵn có). Trả lời qua Send API bằng page token. FE inbox 3 cột. Scope đa cửa hàng qua `MsgPage.storeId`.

**Tech Stack:** NestJS, Prisma + MySQL, BullMQ (không dùng cho v1), WebSocket gateway hiện có, Next.js 16 + Tailwind, Jest.

## Global Constraints
- Backend prefix toàn cục `/api` (route `@Controller('messenger')` → `/api/messenger`).
- Guard: `JwtAuthGuard + RolesGuard + PermissionsGuard`; scope non-admin theo `@GetEffectiveStoreId()` (null=ADMIN xem hết).
- Webhook verify chữ ký `X-Hub-Signature-256` = HMAC-SHA256(app secret, raw body).
- Idempotent theo `MsgMessage.mid` (Meta message id) — webhook có thể trùng.
- Tiền/tài nguyên ra Meta: Graph `https://graph.facebook.com/v21.0` (env `META_GRAPH_URL` đổi được).
- Enum chiều tin: `IN` | `OUT`. Trạng thái: `SENT`|`DELIVERED`|`READ`|`FAILED`.

---

### Task 1: Prisma models + migration + permissions

**Files:**
- Modify: `prisma/schema.prisma` (thêm 4 model)
- Create: `prisma/migrations/20260701090000_messenger_inbox/migration.sql`
- Modify: `src/auth/enums/permissions.enum.ts` (thêm `MESSENGER_VIEW`, `MESSENGER_SEND`)

**Interfaces — Produces:** models `MsgPage`, `MsgContact`, `MsgConversation`, `MsgMessage`; `Permission.MESSENGER_VIEW`, `Permission.MESSENGER_SEND`.

- [ ] **Step 1: Thêm models vào schema.prisma**

```prisma
model MsgPage {
  id           String    @id @default(uuid())
  storeId      String?   @map("store_id")
  platform     String    @default("META")
  externalId   String    @map("external_id")
  name         String?   @db.Text
  accessToken  String?   @map("access_token") @db.Text
  subscribed   Boolean   @default(false)
  lastSyncedAt DateTime? @map("last_synced_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  conversations MsgConversation[]
  contacts      MsgContact[]
  @@unique([platform, externalId])
  @@map("msg_pages")
}

model MsgContact {
  id        String   @id @default(uuid())
  pageId    String   @map("page_id")
  psid      String
  name      String?  @db.Text
  avatarUrl String?  @map("avatar_url") @db.Text
  raw       Json?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  page      MsgPage  @relation(fields: [pageId], references: [id], onDelete: Cascade)
  conversations MsgConversation[]
  @@unique([pageId, psid])
  @@map("msg_contacts")
}

model MsgConversation {
  id              String    @id @default(uuid())
  pageId          String    @map("page_id")
  contactId       String    @map("contact_id")
  lastMessageAt   DateTime? @map("last_message_at")
  lastMessageText String?   @map("last_message_text") @db.Text
  lastMessageDir  String?   @map("last_message_dir")
  unreadCount     Int       @default(0) @map("unread_count")
  status          String    @default("OPEN")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  page            MsgPage    @relation(fields: [pageId], references: [id], onDelete: Cascade)
  contact         MsgContact @relation(fields: [contactId], references: [id], onDelete: Cascade)
  messages        MsgMessage[]
  @@unique([pageId, contactId])
  @@index([pageId, lastMessageAt])
  @@map("msg_conversations")
}

model MsgMessage {
  id             String   @id @default(uuid())
  conversationId String   @map("conversation_id")
  mid            String?  @unique
  direction      String   // IN | OUT
  text           String?  @db.Text
  attachments    Json?
  status         String?
  sentByUserId   String?  @map("sent_by_user_id")
  createdAt      DateTime @default(now()) @map("created_at")
  conversation   MsgConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  @@index([conversationId, createdAt])
  @@map("msg_messages")
}
```

- [ ] **Step 2: Thêm permission**

Trong `permissions.enum.ts` thêm:
```typescript
  MESSENGER_VIEW = 'MESSENGER_VIEW',
  MESSENGER_SEND = 'MESSENGER_SEND',
```

- [ ] **Step 3: Viết migration.sql** (CREATE TABLE cho 4 bảng + index/unique tương ứng — additive). Nội dung: `CREATE TABLE msg_pages/msg_contacts/msg_conversations/msg_messages` với cột map ở trên, `UNIQUE`/`INDEX`/FK `ON DELETE CASCADE`.

- [ ] **Step 4: Apply + generate**

Run: `npx prisma migrate deploy && npx prisma generate` (dừng backend trước nếu khóa DLL).
Expected: "All migrations have been successfully applied"; client có `msgPage`.

- [ ] **Step 5: Commit** `git add prisma src/auth/enums && git commit -m "feat(messenger): models + permissions"`

---

### Task 2: Meta Messenger client (HTTP thuần)

**Files:**
- Create: `src/messenger/meta-messenger.client.ts`
- Test: `src/messenger/meta-messenger.client.spec.ts`

**Interfaces — Produces:**
- `sendMessage(pageToken, recipientPsid, payload): Promise<{ message_id: string }>`
- `getProfile(pageToken, psid): Promise<{ name?: string; profile_pic?: string }>`
- `subscribeApp(pageToken, pageId): Promise<boolean>`
- `fetchConversations(pageToken, pageId): Promise<any[]>` (phân trang)
- `fetchMessages(pageToken, conversationId): Promise<any[]>`

- [ ] **Step 1: Test (mock fetch) cho sendMessage build đúng URL/body**

```typescript
import { MetaMessengerClient } from './meta-messenger.client';
describe('MetaMessengerClient', () => {
  it('sendMessage posts to /{page}/messages with recipient + message', async () => {
    const calls: any[] = [];
    global.fetch = jest.fn(async (url: any, init: any) => { calls.push({ url, init }); return { ok: true, json: async () => ({ message_id: 'm1' }) }; }) as any;
    const c = new MetaMessengerClient();
    const r = await c.sendMessage('TOK', 'PSID1', { text: 'hi' });
    expect(r.message_id).toBe('m1');
    expect(String(calls[0].url)).toContain('/PAGE_ME/messages'.replace('PAGE_ME', 'me'));
    const body = JSON.parse(calls[0].init.body);
    expect(body.recipient.id).toBe('PSID1');
    expect(body.message.text).toBe('hi');
  });
});
```

- [ ] **Step 2: Run → FAIL** `npx jest meta-messenger.client -t sendMessage` (module chưa có).

- [ ] **Step 3: Viết client**

```typescript
import { Injectable, Logger } from '@nestjs/common';
const GRAPH = (process.env.META_GRAPH_URL || 'https://graph.facebook.com/v21.0').replace(/\/$/, '');

export interface SendPayload { text?: string; attachmentUrl?: string; }

@Injectable()
export class MetaMessengerClient {
  private readonly logger = new Logger(MetaMessengerClient.name);

  private async call(path: string, init: RequestInit, token: string): Promise<any> {
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(`${GRAPH}/${path}${sep}access_token=${encodeURIComponent(token)}`, { ...init, signal: AbortSignal.timeout(30_000) });
    const json: any = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);
    return json;
  }

  async sendMessage(pageToken: string, recipientPsid: string, payload: SendPayload) {
    const message = payload.attachmentUrl
      ? { attachment: { type: 'image', payload: { url: payload.attachmentUrl, is_reusable: true } } }
      : { text: payload.text };
    return this.call('me/messages', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recipient: { id: recipientPsid }, message, messaging_type: 'RESPONSE' }),
    }, pageToken);
  }

  async getProfile(pageToken: string, psid: string) {
    return this.call(`${psid}?fields=name,profile_pic`, { method: 'GET' }, pageToken).catch(() => ({}));
  }

  async subscribeApp(pageToken: string, pageId: string): Promise<boolean> {
    const r = await this.call(`${pageId}/subscribed_apps`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subscribed_fields: ['messages', 'messaging_postbacks', 'message_echoes'] }),
    }, pageToken).catch((e) => { this.logger.warn(`subscribe ${pageId}: ${e.message}`); return null; });
    return !!r?.success;
  }

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

  fetchConversations(pageToken: string, pageId: string) {
    return this.getEdge(`${pageId}/conversations?fields=id,participants,updated_time,unread_count&limit=50`, pageToken);
  }
  fetchMessages(pageToken: string, conversationId: string) {
    return this.getEdge(`${conversationId}/messages?fields=id,message,from,to,created_time&limit=50`, pageToken);
  }
}
```

- [ ] **Step 4: Run → PASS** `npx jest meta-messenger.client`.
- [ ] **Step 5: Commit** `git commit -am "feat(messenger): meta client"`

---

### Task 3: Webhook signature verify + GET challenge

**Files:**
- Create: `src/messenger/messenger-webhook.controller.ts`
- Create: `src/messenger/messenger-signature.util.ts`
- Test: `src/messenger/messenger-signature.util.spec.ts`

**Interfaces — Produces:** `verifySignature(appSecret, rawBody, header): boolean`; controller `GET /api/messenger/webhook` trả challenge.

- [ ] **Step 1: Test verifySignature**

```typescript
import { createHmac } from 'crypto';
import { verifySignature } from './messenger-signature.util';
it('valid sha256 sig passes', () => {
  const body = Buffer.from('{"a":1}');
  const sig = 'sha256=' + createHmac('sha256', 'secret').update(body).digest('hex');
  expect(verifySignature('secret', body, sig)).toBe(true);
  expect(verifySignature('secret', body, 'sha256=deadbeef')).toBe(false);
});
```

- [ ] **Step 2: Run → FAIL** `npx jest messenger-signature`.

- [ ] **Step 3: Viết util**

```typescript
import { createHmac, timingSafeEqual } from 'crypto';
export function verifySignature(appSecret: string, rawBody: Buffer, header?: string): boolean {
  if (!header?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const got = header.slice(7);
  if (got.length !== expected.length) return false;
  try { return timingSafeEqual(Buffer.from(got), Buffer.from(expected)); } catch { return false; }
}
```

- [ ] **Step 4: Controller GET challenge** (verify_token = `MESSENGER_VERIFY_TOKEN`):

```typescript
@Controller('messenger/webhook')
export class MessengerWebhookController {
  constructor(private readonly service: MessengerService) {}
  @Get()
  verify(@Query('hub.mode') mode: string, @Query('hub.verify_token') token: string, @Query('hub.challenge') challenge: string) {
    if (mode === 'subscribe' && token === process.env.MESSENGER_VERIFY_TOKEN) return challenge;
    throw new ForbiddenException('Bad verify token');
  }
}
```

- [ ] **Step 5: Run jest → PASS; Commit** `git commit -am "feat(messenger): webhook verify + challenge"`

> **Lưu ý raw body:** cần raw Buffer để verify chữ ký. Trong `main.ts` đảm bảo `express.json({ verify: (req,_res,buf)=>{ (req as any).rawBody = buf; } })` áp cho route webhook (kiểm tra cấu hình hiện có; Casso webhook đã cần raw → tái dùng pattern đó).

---

### Task 4: Ingest webhook event (upsert contact/conversation/message, idempotent)

**Files:**
- Create: `src/messenger/messenger.service.ts` (phần ingest)
- Modify: `src/messenger/messenger-webhook.controller.ts` (POST)
- Test: `src/messenger/messenger.service.spec.ts`

**Interfaces — Produces:** `MessengerService.ingestEvent(body): Promise<void>`; `handleMessaging(pageExternalId, m): Promise<void>`.

- [ ] **Step 1: Test ingest tin IN tạo conversation + message, idempotent theo mid**

```typescript
// mock PrismaService với in-memory; assert upsert gọi đúng + lần 2 cùng mid không tạo thêm
```
(Dùng `jest.fn()` cho `prisma.msgPage.findUnique`, `msgContact.upsert`, `msgConversation.upsert`, `msgMessage.findUnique/create`.)

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Viết ingest**

```typescript
async ingestEvent(body: any): Promise<void> {
  for (const entry of body?.entry ?? []) {
    const pageExternalId = String(entry.id);
    for (const m of entry.messaging ?? []) await this.handleMessaging(pageExternalId, m).catch((e)=>this.logger.error(e.message));
  }
}
async handleMessaging(pageExternalId: string, m: any): Promise<void> {
  const page = await this.prisma.msgPage.findUnique({ where: { platform_externalId: { platform: 'META', externalId: pageExternalId } } });
  if (!page || !m.message) return;
  const isEcho = !!m.message.is_echo;
  const psid = isEcho ? m.recipient?.id : m.sender?.id;
  if (!psid) return;
  const mid = m.message.mid;
  if (mid && await this.prisma.msgMessage.findUnique({ where: { mid } })) return; // idempotent
  const contact = await this.prisma.msgContact.upsert({
    where: { pageId_psid: { pageId: page.id, psid } },
    create: { pageId: page.id, psid }, update: {},
  });
  const conv = await this.prisma.msgConversation.upsert({
    where: { pageId_contactId: { pageId: page.id, contactId: contact.id } },
    create: { pageId: page.id, contactId: contact.id }, update: {},
  });
  const direction = isEcho ? 'OUT' : 'IN';
  const text = m.message.text ?? null;
  const attachments = m.message.attachments ?? undefined;
  await this.prisma.msgMessage.create({ data: { conversationId: conv.id, mid, direction, text, attachments, status: 'DELIVERED' } });
  await this.prisma.msgConversation.update({ where: { id: conv.id }, data: {
    lastMessageAt: new Date(Number(m.timestamp) || Date.now()), lastMessageText: text ?? '[đính kèm]', lastMessageDir: direction,
    unreadCount: direction === 'IN' ? { increment: 1 } : undefined,
  }});
  await this.enrichContactIfNeeded(page, contact);     // gọi getProfile nếu thiếu name
  this.realtime.emitMessage(conv.id, page.storeId);    // Task 5
}
```

- [ ] **Step 4: POST webhook controller**

```typescript
@Post()
async receive(@Req() req: any, @Headers('x-hub-signature-256') sig: string, @Body() body: any) {
  if (!verifySignature(process.env.META_APP_SECRET || '', req.rawBody || Buffer.from(JSON.stringify(body)), sig)) throw new ForbiddenException('bad sig');
  await this.service.ingestEvent(body);
  return 'EVENT_RECEIVED';
}
```

- [ ] **Step 5: Run jest → PASS; Commit.**

---

### Task 5: Realtime emit qua admin-notifications gateway

**Files:**
- Modify: `src/modules/admin-notifications/admin-notifications.gateway.ts` (thêm `emitMessenger(payload)`), hoặc inject service hiện có.
- Modify: `src/messenger/messenger.service.ts` (gọi emit)

**Interfaces — Produces:** event WS `messenger:message` payload `{ conversationId, storeId }`.

- [ ] **Step 1:** Đọc gateway hiện có, thêm method emit (tái dùng cơ chế broadcast hiện hữu). - [ ] **Step 2:** Service gọi sau khi lưu. - [ ] **Step 3:** Commit. *(Không unit test — tích hợp; verify ở Task 10 live.)*

---

### Task 6: REST đọc — pages, conversations, messages, read (scope store)

**Files:**
- Create: `src/messenger/messenger.controller.ts`
- Modify: `src/messenger/messenger.service.ts`
- Test: `src/messenger/messenger.service.spec.ts` (scope filter)

**Interfaces — Produces:**
- `listPages(storeId)`, `listConversations(storeId, pageId?, q?)`, `listMessages(storeId, convId)`, `markRead(storeId, convId)`.
- Endpoints: `GET /messenger/pages`, `GET /messenger/conversations`, `GET /messenger/conversations/:id/messages`, `POST /messenger/conversations/:id/read`.

- [ ] **Step 1: Test listConversations scope** — non-admin chỉ trả conv của page thuộc store (where `page: { storeId }`). - [ ] **Step 2: FAIL.** - [ ] **Step 3:** Viết service (scope qua quan hệ `page.storeId` khi `storeId != null`) + controller (guard + `@Permissions(MESSENGER_VIEW)` + `@GetEffectiveStoreId()`). `markRead` set `unreadCount=0`. - [ ] **Step 4: PASS.** - [ ] **Step 5: Commit.**

---

### Task 7: Trả lời (Send API + cửa sổ 24h)

**Files:**
- Modify: `src/messenger/messenger.service.ts` (`reply`)
- Modify: `src/messenger/messenger.controller.ts` (`POST /conversations/:id/reply`)
- Test: `src/messenger/messenger.service.spec.ts` (chặn ngoài 24h)

**Interfaces — Produces:** `reply(storeId, userId, convId, { text?, attachmentUrl? })`.

- [ ] **Step 1: Test** — nếu `lastMessageAt` (tin IN gần nhất) > 24h → ném lỗi `Ngoài cửa sổ 24h`, không gọi client. Trong 24h → gọi `client.sendMessage` + tạo MsgMessage(OUT, sentByUserId, mid từ kết quả). - [ ] **Step 2: FAIL.** - [ ] **Step 3:** Viết:
```typescript
async reply(storeId: string|null, userId: string, convId: string, p: { text?: string; attachmentUrl?: string }) {
  const conv = await this.getScopedConversation(storeId, convId); // include page, contact
  const lastIn = await this.prisma.msgMessage.findFirst({ where: { conversationId: convId, direction: 'IN' }, orderBy: { createdAt: 'desc' } });
  if (!lastIn || Date.now() - lastIn.createdAt.getTime() > 24*3600*1000) throw new BadRequestException('Ngoài cửa sổ 24h — không thể nhắn chủ động.');
  const r = await this.client.sendMessage(conv.page.accessToken!, conv.contact.psid, p);
  await this.prisma.msgMessage.create({ data: { conversationId: convId, mid: r.message_id, direction: 'OUT', text: p.text ?? null, status: 'SENT', sentByUserId: userId } });
  await this.prisma.msgConversation.update({ where: { id: convId }, data: { lastMessageAt: new Date(), lastMessageText: p.text ?? '[đính kèm]', lastMessageDir: 'OUT' } });
  return { ok: true };
}
```
controller dùng `@Permissions(MESSENGER_SEND)` + `@GetUser()`. - [ ] **Step 4: PASS.** - [ ] **Step 5: Commit.**

---

### Task 8: Subscribe page + backfill

**Files:**
- Modify: `src/messenger/messenger.service.ts` (`subscribePage`, `backfill`, `upsertPagesFromAds`)
- Modify: `src/messenger/messenger.controller.ts` (`POST /pages/:externalId/subscribe`, `POST /backfill`)

**Interfaces — Produces:** `subscribePage(externalId)`, `backfill(externalId)`.

- [ ] **Step 1:** `upsertPagesFromAds`: lấy page (token có MESSAGING) từ `AdPage`/`/me/accounts` → tạo `MsgPage` với access_token (tái dùng config META_ADS). - [ ] **Step 2:** `subscribePage` → `client.subscribeApp` + set `subscribed=true`. - [ ] **Step 3:** `backfill` → `fetchConversations` + `fetchMessages` → ingest dạng chuẩn hoá. - [ ] **Step 4:** Endpoints. - [ ] **Step 5: Commit.** *(Verify live ở Task 10.)*

---

### Task 9: Module wiring

**Files:**
- Create: `src/messenger/messenger.module.ts`
- Modify: `src/app.module.ts` (import MessengerModule)

- [ ] **Step 1:** Module providers: MessengerService, MetaMessengerClient; controllers: MessengerController, MessengerWebhookController; imports: PrismaModule + module chứa gateway. - [ ] **Step 2:** Import vào AppModule. - [ ] **Step 3:** `npx tsc --noEmit` sạch + boot backend thấy route `/api/messenger/*` mapped. - [ ] **Step 4: Commit.**

---

### Task 10: FE inbox 3 cột + realtime

**Files:**
- Create: `src/app/admin/messenger/page.tsx`
- Create: `src/components/admin/MessengerInbox.tsx` (danh sách hội thoại │ thread │ composer)
- Modify: sidebar (`AdminSidebar.tsx` hoặc menu) thêm mục "Tin nhắn"

- [ ] **Step 1:** `MessengerInbox`: load `/messenger/conversations`, chọn hội thoại → load `/messenger/conversations/:id/messages` + `POST .../read`; composer gọi `POST .../reply`. - [ ] **Step 2:** Kết nối WebSocket (tái dùng client socket của `AdminNotifications`), nghe `messenger:message` → reload hội thoại/thread. - [ ] **Step 3:** Sidebar thêm route `/admin/messenger`. - [ ] **Step 4:** `tsc --noEmit` FE sạch. - [ ] **Step 5: Commit.**

---

### Task 11: Env + tài liệu + verify live

**Files:**
- Modify: `.env.example` (thêm `MESSENGER_VERIFY_TOKEN`, `META_APP_SECRET`)
- Modify: `docs/05-integrations-webhooks.md` (mục Messenger)

- [ ] **Step 1:** Thêm env mẫu + doc luồng + cách khai Callback URL. - [ ] **Step 2 (ops, user):** dựng tunnel HTTPS → Meta App → Messenger → Callback URL = `<public>/api/messenger/webhook`, Verify Token = env; Subscribe page; bật fields `messages`. - [ ] **Step 3 (verify live):** gửi tin thử từ FB → thấy real-time; trả lời → khách nhận. - [ ] **Step 4: Commit.**

## Self-Review
- **Spec coverage:** webhook (T3,4), model (T1), send+24h (T7), backfill (T8), realtime (T5,10), scope+quyền (T1,6,7), env (T11), UI (T10), 1 page test (T8 subscribe 1 page). ✓ Đủ.
- **Placeholder:** code chính (client, signature, ingest, reply) có thật; T5/T8/T10 mô tả bước rõ + tái dùng pattern hiện có.
- **Type consistency:** `direction` IN/OUT, `mid` unique, `MsgPage.accessToken`, scope qua `page.storeId` — nhất quán giữa các task.
