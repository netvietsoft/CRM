# ViettelPost Pull (Webhook + Secret) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho ViettelPost đổ dữ liệu hành trình đơn về CRM qua 1 webhook endpoint có xác thực Secret per-store; đơn không khớp → tạo `source='VIETTEL'`.

**Architecture:** Một endpoint `POST /api/viettelpost/webhook` luôn trả HTTP 200. Service xác thực Secret bằng `timingSafeEqual` đối chiếu `StoreIntegration.metadata.webhookSecret` của các integration VIETTELPOST đang bật → suy ra `storeId`. Khớp đơn → cập nhật (đã có); không khớp → tạo đơn mới `source='VIETTEL'` (idempotent qua `orderCode` unique / bắt P2002).

**Tech Stack:** NestJS, Prisma (MySQL), Jest (ts-jest), Next.js 16 (FE admin).

## Global Constraints

- Backend prefix toàn cục `/api`; route `@Controller('viettelpost')` → thực tế `/api/viettelpost/*`.
- Webhook PHẢI trả HTTP 200 trong < 1s; webhook trùng/lỗi map → log + 200 (VTP retry tối đa 5 lần nếu không nhận 200).
- So sánh secret bằng `crypto.timingSafeEqual` (không `===`); guard độ dài buffer trước khi so.
- Đơn `source='VIETTEL'`: `userId=null` (khách vãng lai), `orderCode = ORDER_NUMBER` (mã vận đơn VTP), gọi `OrderSourcesService.ensureExists('VIETTEL','Viettel')`.
- Trạng thái map dùng `mapVtpStatusToOrderStatus` (đã có) cho cả nhánh update lẫn create. KHÔNG đụng `mapViettelPostStatus` trong `voucher.processor.ts` (khác domain — ShippingStatus, ngoài phạm vi).
- Test backend chạy: `corepack yarn@stable test` (jest, testRegex `.*\.spec\.ts$`, rootDir `src`). Luôn set `$env:TMP="D:\yarn-temp"` trước trên PowerShell.

**Deviations from spec:** Spec mục 3.4 "gộp 2 bảng map" được THU HẸP: hai map khác domain (OrderStatus vs ShippingStatus voucher), chỉ thống nhất ở domain OrderStatus bằng cách cho create + update dùng chung `mapVtpStatusToOrderStatus`; map voucher giữ nguyên. Spec mục 3.1 bỏ endpoint `/order-webhook`: phần capture-log giữ lại (hàm `captureViettelOrderWebhook`) và được gọi từ orchestrator.

---

### Task 1: `createOrderFromViettel` + wire OrderSourcesService

Tạo đơn `source='VIETTEL'` từ payload webhook khi không khớp đơn nào. Wire `OrderSourcesService` vào module + constructor.

**Files:**
- Modify: `backend-nestjs/src/webhooks/webhooks.module.ts` (import OrderSourcesModule)
- Modify: `backend-nestjs/src/webhooks/webhooks.service.ts` (import + inject OrderSourcesService; thêm method `createOrderFromViettel`)
- Modify: `backend-nestjs/src/order-sources/order-sources.module.ts` (đã `exports: [OrderSourcesService]` — KHÔNG cần sửa, chỉ xác nhận)
- Test: `backend-nestjs/src/webhooks/webhooks.service.spec.ts` (tạo mới)

**Interfaces:**
- Consumes: `OrderSourcesService.ensureExists(code?: string|null, name?: string): Promise<void>`; `this.parseProviderDate(value?: string|null): Date|null` (đã có); `this.mapVtpStatusToOrderStatus(vtpStatus: number): string|null` (đã có).
- Produces: `private async createOrderFromViettel(payload: ViettelPostWebhookDto, storeId?: string|null): Promise<void>` — tạo Order với `orderCode = payload.DATA.ORDER_NUMBER`, `source='VIETTEL'`; nuốt P2002 (đã tồn tại).

- [ ] **Step 1: Wire OrderSourcesModule vào WebhooksModule**

Sửa `backend-nestjs/src/webhooks/webhooks.module.ts`:

```typescript
import { OrderSourcesModule } from '../order-sources/order-sources.module';
```

Thêm `OrderSourcesModule` vào mảng `imports` (sau `VouchersModule`):

```typescript
  imports: [
    PrismaModule,
    OrdersModule,
    AdminNotificationsModule,
    IntegrationsModule,
    MessagingModule,
    VouchersModule,
    OrderSourcesModule,
    ...getQueueImports(),
  ],
```

- [ ] **Step 2: Inject OrderSourcesService vào WebhooksService**

Sửa import đầu `backend-nestjs/src/webhooks/webhooks.service.ts`:

```typescript
import { OrderSourcesService } from '../order-sources/order-sources.service';
```

Thêm tham số vào constructor (TRƯỚC `@Optional()` voucherQueue — optional phải đứng cuối):

```typescript
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminNotificationsService: AdminNotificationsService,
    private readonly pancakeService: PancakeService,
    private readonly messagingAutomationService: MessagingAutomationService,
    private readonly vouchersService: VouchersService,
    private readonly orderSourcesService: OrderSourcesService,
    @Optional() @InjectQueue('voucher-queue') private voucherQueue?: Queue,
  ) {}
```

- [ ] **Step 3: Write the failing test**

Tạo `backend-nestjs/src/webhooks/webhooks.service.spec.ts`:

```typescript
import { WebhooksService } from './webhooks.service';

function makeService() {
  const prisma: any = {
    order: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    systemConfig: { findUnique: jest.fn(), upsert: jest.fn() },
    storeIntegration: { findMany: jest.fn() },
    userVoucher: { findUnique: jest.fn() },
  };
  const adminNotificationsService: any = { createNotification: jest.fn() };
  const pancakeService: any = {};
  const messagingAutomationService: any = { handleOrderStateChange: jest.fn() };
  const vouchersService: any = { processSuccessfulOrderVoucherRules: jest.fn() };
  const orderSourcesService: any = { ensureExists: jest.fn() };
  const service = new WebhooksService(
    prisma,
    adminNotificationsService,
    pancakeService,
    messagingAutomationService,
    vouchersService,
    orderSourcesService,
  );
  return { service, prisma, adminNotificationsService, orderSourcesService };
}

describe('WebhooksService.createOrderFromViettel', () => {
  const basePayload = {
    DATA: {
      ORDER_NUMBER: 'VTP123',
      ORDER_STATUS: 501,
      STATUS_NAME: 'Đã giao hàng',
      ORDER_REFERENCE: 'REF9',
      ORDER_STATUSDATE: '2026-06-29 10:00:00',
      MONEY_COLLECTION: 250000,
      MONEY_TOTAL: 250000,
      RECEIVER_FULLNAME: 'Nguyen Van A',
    },
  } as any;

  it('creates an order with source=VIETTEL mapped from payload', async () => {
    const { service, prisma, orderSourcesService } = makeService();
    prisma.order.create.mockResolvedValue({ id: 'o1', orderCode: 'VTP123' });

    await (service as any).createOrderFromViettel(basePayload, 'store-1');

    expect(orderSourcesService.ensureExists).toHaveBeenCalledWith('VIETTEL', 'Viettel');
    expect(prisma.order.create).toHaveBeenCalledTimes(1);
    const arg = prisma.order.create.mock.calls[0][0].data;
    expect(arg.orderCode).toBe('VTP123');
    expect(arg.source).toBe('VIETTEL');
    expect(arg.storeId).toBe('store-1');
    expect(arg.shippingName).toBe('Nguyen Van A');
    expect(arg.totalAmount).toBe(250000);
    expect(arg.status).toBe('DELIVERED');
    expect(arg.metadata.partner.trackingCode).toBe('VTP123');
  });

  it('swallows P2002 (order already exists) without throwing', async () => {
    const { service, prisma } = makeService();
    prisma.order.create.mockRejectedValue({ code: 'P2002' });
    await expect(
      (service as any).createOrderFromViettel(basePayload, 'store-1'),
    ).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `corepack yarn@stable test src/webhooks/webhooks.service.spec.ts`
Expected: FAIL — `createOrderFromViettel is not a function`.

- [ ] **Step 5: Implement `createOrderFromViettel`**

Thêm vào `backend-nestjs/src/webhooks/webhooks.service.ts` (gần `updateOrderFromWebhook`):

```typescript
  /** Tạo đơn source='VIETTEL' từ payload webhook khi không khớp đơn nào (kéo đơn về). */
  private async createOrderFromViettel(
    payload: ViettelPostWebhookDto,
    storeId?: string | null,
  ): Promise<void> {
    const d = payload.DATA;
    const orderCode = d.ORDER_NUMBER;
    if (!orderCode) return;

    await this.orderSourcesService.ensureExists('VIETTEL', 'Viettel');

    const status = this.mapVtpStatusToOrderStatus(d.ORDER_STATUS) || 'PENDING';
    const cod = Number(d.MONEY_COLLECTION || 0);
    const total = Number(d.MONEY_TOTAL || 0) || cod;
    const paymentStatus = [500, 505].includes(d.ORDER_STATUS) ? 'PAID' : 'UNPAID';
    const statusDate = this.parseProviderDate(d.ORDER_STATUSDATE) || new Date();

    try {
      const created = await this.prisma.order.create({
        data: {
          orderCode,
          source: 'VIETTEL',
          storeId: storeId || null,
          shippingName: d.RECEIVER_FULLNAME || null,
          subtotal: total,
          totalAmount: total,
          status: status as OrderStatus,
          paymentStatus: paymentStatus as PaymentStatus,
          note: d.STATUS_NAME || d.NOTE || null,
          metadata: {
            partner: {
              provider: 'VIETTELPOST',
              trackingCode: orderCode,
              reference: d.ORDER_REFERENCE || null,
              cod,
              courierUpdates: [
                {
                  status: d.STATUS_NAME || `VTP-${d.ORDER_STATUS}`,
                  key: `VTP_${d.ORDER_STATUS}`,
                  note: d.NOTE || null,
                  update_at: statusDate.toISOString(),
                },
              ],
            },
          },
        },
      });

      this.logger.log(`✅ [VTP] Tạo đơn source=VIETTEL: ${orderCode} (status ${status})`);

      await this.adminNotificationsService.createNotification({
        type: 'VTP',
        title: `Đơn ViettelPost mới: ${orderCode}`,
        message: d.STATUS_NAME || `VTP-${d.ORDER_STATUS}`,
        link: `/admin/orders/${created.id}`,
        metadata: { orderId: created.id, trackingCode: orderCode, status: d.ORDER_STATUS, source: 'VIETTEL' },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        this.logger.warn(`[VTP] Đơn ${orderCode} đã tồn tại (P2002) → bỏ qua tạo trùng.`);
        return;
      }
      throw e;
    }
  }
```

- [ ] **Step 6: Run test to verify it passes**

Run: `corepack yarn@stable test src/webhooks/webhooks.service.spec.ts`
Expected: PASS (2 test).

- [ ] **Step 7: Verify backend compiles**

Run: `corepack yarn@stable build`
Expected: build thành công, không lỗi TS.

- [ ] **Step 8: Commit**

```bash
git add backend-nestjs/src/webhooks/webhooks.module.ts backend-nestjs/src/webhooks/webhooks.service.ts backend-nestjs/src/webhooks/webhooks.service.spec.ts
git commit -m "feat(viettelpost): create order source=VIETTEL from unmatched webhook"
```

---

### Task 2: Xác thực Secret per-store (`matchViettelWebhookStore`)

Đối chiếu `payload.DATA.token` với `StoreIntegration.metadata.webhookSecret` của các integration VIETTELPOST đang bật bằng `timingSafeEqual`; trả integration khớp + cờ có-secret-cấu-hình-hay-chưa.

**Files:**
- Modify: `backend-nestjs/src/webhooks/webhooks.service.ts` (thêm `matchViettelWebhookStore`)
- Test: `backend-nestjs/src/webhooks/webhooks.service.spec.ts` (thêm describe block)

**Interfaces:**
- Consumes: `prisma.storeIntegration.findMany({ where:{platform:'VIETTELPOST', isActive:true}, select:{id,storeId,metadata} })`.
- Produces: `private async matchViettelWebhookStore(token?: string|null): Promise<{ integration: { id: string; storeId: string } | null; anySecret: boolean }>`.

- [ ] **Step 1: Write the failing test**

Thêm vào `backend-nestjs/src/webhooks/webhooks.service.spec.ts`:

```typescript
describe('WebhooksService.matchViettelWebhookStore', () => {
  it('matches the store integration by webhookSecret (constant-time)', async () => {
    const { service, prisma } = makeService();
    prisma.storeIntegration.findMany.mockResolvedValue([
      { id: 'i1', storeId: 's1', metadata: { webhookSecret: 'sekret-abc' } },
    ]);
    const res = await (service as any).matchViettelWebhookStore('sekret-abc');
    expect(res.anySecret).toBe(true);
    expect(res.integration).toEqual({ id: 'i1', storeId: 's1' });
  });

  it('returns no integration when secret does not match, but anySecret=true', async () => {
    const { service, prisma } = makeService();
    prisma.storeIntegration.findMany.mockResolvedValue([
      { id: 'i1', storeId: 's1', metadata: { webhookSecret: 'right' } },
    ]);
    const res = await (service as any).matchViettelWebhookStore('wrong-and-longer');
    expect(res.anySecret).toBe(true);
    expect(res.integration).toBeNull();
  });

  it('reports anySecret=false when no integration has a webhookSecret', async () => {
    const { service, prisma } = makeService();
    prisma.storeIntegration.findMany.mockResolvedValue([
      { id: 'i1', storeId: 's1', metadata: {} },
    ]);
    const res = await (service as any).matchViettelWebhookStore('anything');
    expect(res.anySecret).toBe(false);
    expect(res.integration).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack yarn@stable test src/webhooks/webhooks.service.spec.ts -t matchViettelWebhookStore`
Expected: FAIL — `matchViettelWebhookStore is not a function`.

- [ ] **Step 3: Implement `matchViettelWebhookStore`**

Thêm vào `backend-nestjs/src/webhooks/webhooks.service.ts` (`crypto` đã import sẵn ở đầu file):

```typescript
  /**
   * Đối chiếu secret webhook (payload.DATA.token) với StoreIntegration.metadata.webhookSecret
   * của các integration VIETTELPOST đang bật, dùng timingSafeEqual.
   * Trả integration khớp (để lấy storeId) + cờ anySecret (đã có store nào cấu hình secret chưa).
   */
  private async matchViettelWebhookStore(
    token?: string | null,
  ): Promise<{ integration: { id: string; storeId: string } | null; anySecret: boolean }> {
    const integrations = await this.prisma.storeIntegration.findMany({
      where: { platform: 'VIETTELPOST', isActive: true },
      select: { id: true, storeId: true, metadata: true },
    });

    let anySecret = false;
    let matched: { id: string; storeId: string } | null = null;
    const tokenBuf = token ? Buffer.from(String(token)) : null;

    for (const it of integrations) {
      const secret = (it.metadata as any)?.webhookSecret;
      if (!secret) continue;
      anySecret = true;
      if (!tokenBuf) continue;
      const secretBuf = Buffer.from(String(secret));
      if (secretBuf.length === tokenBuf.length && crypto.timingSafeEqual(secretBuf, tokenBuf)) {
        matched = { id: it.id, storeId: it.storeId };
      }
    }

    return { integration: matched, anySecret };
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack yarn@stable test src/webhooks/webhooks.service.spec.ts -t matchViettelWebhookStore`
Expected: PASS (3 test).

- [ ] **Step 5: Commit**

```bash
git add backend-nestjs/src/webhooks/webhooks.service.ts backend-nestjs/src/webhooks/webhooks.service.spec.ts
git commit -m "feat(viettelpost): per-store webhook secret verification (timingSafeEqual)"
```

---

### Task 3: Orchestrator `handleViettelWebhook` + thread storeId + controller 1 endpoint

Gộp verify + capture + dispatch; luôn trả 200. Khớp đơn → update; không khớp → create. Controller còn 1 route, không throw 401.

**Files:**
- Modify: `backend-nestjs/src/webhooks/webhooks.service.ts` (thêm `handleViettelWebhook`; sửa `processViettelPostWebhook` + `updateOrderFromWebhook` nhận `storeId`; xoá `validateWebhookToken` cũ)
- Modify: `backend-nestjs/src/webhooks/webhooks.controller.ts` (gộp còn 1 route `/webhook`, gọi `handleViettelWebhook`, HttpCode 200)
- Test: `backend-nestjs/src/webhooks/webhooks.service.spec.ts` (thêm describe block)

**Interfaces:**
- Consumes: `matchViettelWebhookStore` (Task 2), `createOrderFromViettel` (Task 1), `captureViettelOrderWebhook` (đã có), `processViettelPostWebhook` (sửa nhận storeId).
- Produces: `async handleViettelWebhook(payload: any, headers?: Record<string,string>): Promise<{ success: true; skipped?: string }>`.

- [ ] **Step 1: Write the failing test**

Thêm vào `backend-nestjs/src/webhooks/webhooks.service.spec.ts`:

```typescript
describe('WebhooksService.handleViettelWebhook', () => {
  const payload = { DATA: { ORDER_NUMBER: 'VTP1', ORDER_STATUS: 501, token: 'good' } } as any;

  it('verifies secret, dispatches processing with storeId, returns 200 shape', async () => {
    const { service, prisma } = makeService();
    jest.spyOn(service as any, 'captureViettelOrderWebhook').mockResolvedValue(undefined);
    prisma.storeIntegration.findMany.mockResolvedValue([
      { id: 'i1', storeId: 's1', metadata: { webhookSecret: 'good' } },
    ]);
    const proc = jest
      .spyOn(service as any, 'processViettelPostWebhook')
      .mockResolvedValue(undefined);

    const res = await service.handleViettelWebhook(payload, {});

    expect(res).toEqual({ success: true });
    expect(proc).toHaveBeenCalledWith(payload, 's1');
  });

  it('skips processing on invalid secret in production (still returns 200)', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const { service, prisma } = makeService();
      jest.spyOn(service as any, 'captureViettelOrderWebhook').mockResolvedValue(undefined);
      prisma.storeIntegration.findMany.mockResolvedValue([
        { id: 'i1', storeId: 's1', metadata: { webhookSecret: 'right' } },
      ]);
      const proc = jest
        .spyOn(service as any, 'processViettelPostWebhook')
        .mockResolvedValue(undefined);

      const res = await service.handleViettelWebhook(
        { DATA: { ORDER_NUMBER: 'VTP1', ORDER_STATUS: 501, token: 'wrong' } } as any,
        {},
      );

      expect(res).toEqual({ success: true, skipped: 'invalid_secret' });
      expect(proc).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('returns 200 even if processing throws', async () => {
    const { service, prisma } = makeService();
    jest.spyOn(service as any, 'captureViettelOrderWebhook').mockResolvedValue(undefined);
    prisma.storeIntegration.findMany.mockResolvedValue([]);
    jest
      .spyOn(service as any, 'processViettelPostWebhook')
      .mockRejectedValue(new Error('boom'));

    const res = await service.handleViettelWebhook(payload, {});
    expect(res).toEqual({ success: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack yarn@stable test src/webhooks/webhooks.service.spec.ts -t handleViettelWebhook`
Expected: FAIL — `handleViettelWebhook is not a function`.

- [ ] **Step 3: Implement `handleViettelWebhook` + thread storeId**

Trong `backend-nestjs/src/webhooks/webhooks.service.ts`:

(a) Thêm method orchestrator:

```typescript
  /** Điểm vào webhook ViettelPost: verify secret + capture mẫu + dispatch. LUÔN trả 200. */
  async handleViettelWebhook(
    payload: any,
    headers?: Record<string, string>,
  ): Promise<{ success: true; skipped?: string }> {
    await this.captureViettelOrderWebhook(payload, headers);

    const token =
      payload?.TOKEN || payload?.DATA?.token || headers?.['x-viettelpost-token'] || null;
    const { integration, anySecret } = await this.matchViettelWebhookStore(token);

    if (!integration && anySecret && process.env.NODE_ENV === 'production') {
      this.logger.warn('⛔ [VTP] Secret webhook không khớp — bỏ qua xử lý (production).');
      return { success: true, skipped: 'invalid_secret' };
    }
    if (!integration && !anySecret) {
      this.logger.warn('⚠️ [VTP] Chưa cấu hình webhookSecret cho store nào — cho qua (dev/chưa cấu hình).');
    }

    try {
      await this.processViettelPostWebhook(payload, integration?.storeId);
    } catch (e: any) {
      this.logger.error(`[VTP] Xử lý webhook lỗi (bypass, trả 200): ${e?.message || e}`);
    }
    return { success: true };
  }
```

(b) Sửa chữ ký `processViettelPostWebhook` để nhận `storeId` và chuyển tiếp:

```typescript
  async processViettelPostWebhook(payload: ViettelPostWebhookDto, storeId?: string | null) {
```

Và đổi dòng gọi bên trong từ `await this.updateOrderFromWebhook(payload);` thành:

```typescript
    await this.updateOrderFromWebhook(payload, storeId);
```

(c) Sửa chữ ký `updateOrderFromWebhook`:

```typescript
  private async updateOrderFromWebhook(payload: ViettelPostWebhookDto, storeId?: string | null) {
```

(d) Thay nhánh không-khớp-đơn (hiện log warn + tạo AdminNotification "(không tìm thấy đơn hàng liên kết)" + `return;`) bằng tạo đơn VIETTEL:

```typescript
    if (orders.length === 0) {
      this.logger.warn(
        `⚠️ [VTP] Không khớp đơn cho tracking ${ORDER_NUMBER} → tạo đơn source=VIETTEL.`,
      );
      await this.createOrderFromViettel(payload, storeId);
      return;
    }
```

(e) Xoá method `validateWebhookToken` (không còn dùng — controller chuyển sang `handleViettelWebhook`).

- [ ] **Step 4: Rewrite controller — 1 endpoint, HttpCode 200, không throw**

Thay toàn bộ `backend-nestjs/src/webhooks/webhooks.controller.ts`:

```typescript
import { Controller, Post, Body, Headers, Logger, HttpCode } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { WebhooksService } from './webhooks.service';

@Controller('viettelpost')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  // ViettelPost đẩy hành trình đơn về đây (1 URL duy nhất theo tài liệu partner2).
  // URL đăng ký bên VTP: https://<domain>/api/viettelpost/webhook
  @Post('webhook')
  @Public()
  @HttpCode(200)
  async handleViettelWebhook(
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log(
      `📨 [VTP] webhook ${payload?.DATA?.ORDER_NUMBER} status ${payload?.DATA?.ORDER_STATUS}`,
    );
    return this.webhooksService.handleViettelWebhook(payload, headers);
  }
}
```

> Lưu ý: bỏ route `/order-webhook` và `/webhook` cũ (dựa DTO + validate token throw). DTO `ViettelPostWebhookDto` vẫn dùng nội bộ trong service (giữ file DTO).

- [ ] **Step 5: Run tests + build**

Run: `corepack yarn@stable test src/webhooks/webhooks.service.spec.ts`
Expected: PASS (toàn bộ describe).
Run: `corepack yarn@stable build`
Expected: build thành công.

- [ ] **Step 6: Commit**

```bash
git add backend-nestjs/src/webhooks/webhooks.service.ts backend-nestjs/src/webhooks/webhooks.controller.ts backend-nestjs/src/webhooks/webhooks.service.spec.ts
git commit -m "feat(viettelpost): unified webhook endpoint, always-200, route storeId by secret"
```

---

### Task 4: FE — trang integrations VTP: ô Secret + hiển thị Webhook URL

**Files:**
- Modify: `frontend/src/app/admin/integrations/[platform]/page.tsx` (block `{['VIETTELPOST'].includes(platformId) && (` quanh dòng 516)

**Interfaces:**
- Consumes: state `formMetadata` + `setFormMetadata` (đã có, round-trip qua `metadata`); `process.env.NEXT_PUBLIC_API_URL`.
- Produces: secret lưu tại `formMetadata.webhookSecret`; hiển thị URL `${NEXT_PUBLIC_API_URL}/viettelpost/webhook`.

- [ ] **Step 1: Thêm UI Secret + Webhook URL vào block VIETTELPOST**

Trong block `{['VIETTELPOST'].includes(platformId) && ( ... )}`, NGAY SAU field "Token (ViettelPost)" hiện có, thêm:

```tsx
              {/* Secret để ViettelPost xác thực webhook đổ về (payload.DATA.token) */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tham số bí mật (Webhook Secret)
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-xl pl-4 pr-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  value={(formMetadata?.webhookSecret as string) || ''}
                  onChange={e =>
                    setFormMetadata({ ...formMetadata, webhookSecret: e.target.value })
                  }
                  placeholder="Tự đặt 1 chuỗi bí mật, khai báo y hệt bên ViettelPost"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Dán chuỗi này vào mục “Tham số bí mật” trên cấu hình tài khoản ViettelPost. VTP sẽ
                  gửi kèm để CRM xác thực nguồn webhook.
                </p>
              </div>

              {/* URL webhook để dán sang ViettelPost */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    className="w-full border border-gray-200 bg-gray-50 rounded-xl pl-4 pr-4 py-3 font-mono text-sm text-gray-700"
                    value={`${process.env.NEXT_PUBLIC_API_URL || ''}/viettelpost/webhook`}
                  />
                  <button
                    type="button"
                    className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm whitespace-nowrap"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        `${process.env.NEXT_PUBLIC_API_URL || ''}/viettelpost/webhook`,
                      )
                    }
                  >
                    Sao chép
                  </button>
                </div>
                {(process.env.NEXT_PUBLIC_API_URL || '').includes('localhost') && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ Đang trỏ localhost — ViettelPost KHÔNG gọi được. Cần domain công khai (deploy
                    hoặc tunnel) thì webhook mới về.
                  </p>
                )}
              </div>
```

- [ ] **Step 2: Verify FE typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: EXIT 0 (không lỗi mới).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/admin/integrations/[platform]/page.tsx
git commit -m "feat(viettelpost): admin UI for webhook secret + webhook URL"
```

---

### Task 5: Cập nhật tài liệu

**Files:**
- Modify: `backend-nestjs/src/webhooks/README.md`
- Modify: `docs/05-integrations-webhooks.md`
- Modify: `docs/changelog.md`

- [ ] **Step 1: Cập nhật `backend-nestjs/src/webhooks/README.md`**

Sửa mục "File chính" + "gotcha": ghi 1 endpoint `POST /viettelpost/webhook` (bỏ `/order-webhook`), secret per-store `StoreIntegration.metadata.webhookSecret` (timingSafeEqual), không khớp đơn → tạo `source='VIETTEL'`, luôn trả 200, capture mẫu vào SystemConfig `viettel_order_webhook_samples`. Đánh dấu env `VIETTELPOST_WEBHOOK_TOKEN/_SECRET` là cũ (thay bằng secret per-store).

- [ ] **Step 2: Cập nhật `docs/05-integrations-webhooks.md`**

Bổ sung luồng: VTP POST 1 URL → verify secret per-store → khớp/không khớp (tạo đơn VIETTEL) → 200 < 1s, retry tối đa 5 lần, trạng thái cuối 101/107/201/501/503/504.

- [ ] **Step 3: Thêm entry `docs/changelog.md`** (mục 2026-06-29) mô tả: gộp 1 webhook endpoint, secret per-store, tạo đơn source=VIETTEL từ webhook không khớp, UI admin secret + URL.

- [ ] **Step 4: Commit**

```bash
git add backend-nestjs/src/webhooks/README.md docs/05-integrations-webhooks.md docs/changelog.md
git commit -m "docs(viettelpost): document unified webhook + per-store secret + VIETTEL order pull"
```

---

## Self-Review

**Spec coverage:**
- Spec 3.1 (1 endpoint thống nhất, luôn 200, capture) → Task 3 (+ capture giữ ở Task 3 orchestrator).
- Spec 3.2 (secret per-store, timingSafeEqual, storeId router) → Task 2 + Task 3.
- Spec 3.3 (tạo đơn VIETTEL, idempotency P2002, ensureExists) → Task 1.
- Spec 3.4 (map dùng chung) → thu hẹp: create + update dùng chung `mapVtpStatusToOrderStatus` (Task 1/3); ghi rõ ở "Deviations".
- Spec 4 (FE secret + URL + cảnh báo localhost) → Task 4.
- Spec 6 (test) → test ở Task 1/2/3.
- Spec 7 (docs) → Task 5.

**Placeholder scan:** không có TODO/TBD; mọi step có code/lệnh cụ thể.

**Type consistency:** `createOrderFromViettel(payload, storeId)`, `matchViettelWebhookStore(token) → {integration:{id,storeId}|null, anySecret}`, `handleViettelWebhook(payload, headers) → {success:true, skipped?}`, `processViettelPostWebhook(payload, storeId?)`, `updateOrderFromWebhook(payload, storeId?)` — nhất quán giữa các task. Mock prisma trong test khớp các bảng dùng (`order`, `systemConfig`, `storeIntegration`, `userVoucher`).
