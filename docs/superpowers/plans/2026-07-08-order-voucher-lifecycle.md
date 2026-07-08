# Voucher theo Đơn hàng — Vòng đời Tạo / Kích hoạt / Hiển thị — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mỗi đơn hàng có 1 voucher + QR riêng do nhân viên tạo tay qua form inline; voucher tự vào ví khách ở trạng thái CHỜ ngay khi tạo, và chỉ kích hoạt khi đơn giao thành công + số tiền ≥ ngưỡng COD cấu hình, hỗ trợ duyệt Auto/Manual, còn đơn hủy/hoàn/đổi/giao-thất-bại thì bị từ chối vĩnh viễn.

**Architecture:** Thêm state machine `PENDING → ACTIVE | WAITING_APPROVAL | REJECTED` cho `UserVoucher` của order-voucher, đóng gói trong một hàm engine thuần trong `VouchersService`, được gọi đồng bộ từ `OrdersService.updateStatus` (nguồn chính) và cron reconcile (lưới an toàn). Admin tạo/duyệt qua endpoint mở rộng của module vouchers; khách xem trạng thái qua trang QR bảo vệ bằng đăng nhập FE (SĐT+OTP lần đầu = đăng nhập). Chỉ đụng phạm vi order-voucher, không đổi logic áp voucher vào đơn.

**Tech Stack:** NestJS 10 + Prisma 5.8 (MySQL) backend; Next.js (App Router, RSC + client components) frontend; Jest (ts-jest, `rootDir: src`, `testRegex: .*\.spec\.ts$`); BullMQ (cron phụ).

## Global Constraints

- **Ngưỡng COD cấu hình được:** `SystemConfig` key `order_voucher_config`, shape `{ codActivationThreshold: number }`, **mặc định 100000**. Đặt riêng, KHÔNG nhét vào `qr_voucher_default`.
- **Giao thành công** (điều kiện kích hoạt): `order.status ∈ { DELIVERED, PAYMENT_COLLECTED, COMPLETED }`.
- **Hỏng / từ chối** (→ `REJECTED`): `order.status ∈ { CANCELLED, REFUNDED, RETURNING, EXCHANGING }` **hoặc** `order.isExchange === true` **hoặc** (đã giao thành công nhưng `totalAmount < codThreshold`).
- **COD dùng `Order.totalAmount`** để so ngưỡng. KHÔNG phụ thuộc `codPayStatus`/mã VTP.
- **`approvalMode` (AUTO | MANUAL) đặt trên `Voucher` của đơn** (mỗi đơn một giá trị). `eligible && AUTO → ACTIVE`; `eligible && MANUAL → WAITING_APPROVAL` (chờ admin bấm Duyệt).
- **Tập giá trị `UserVoucher.status` chuẩn hoá:** `PENDING | WAITING_APPROVAL | ACTIVE | REJECTED` (cột giữ kiểu `String`, không đổi sang enum → không đụng index `[status, unlockAt]`).
- **QR = link XEM trạng thái**, bảo vệ bằng đăng nhập FE khách (không OTP riêng trên trang). Chưa đăng nhập → điều hướng đăng nhập.
- **Chỉ đụng order-voucher.** Không đổi `orders.service.create` (trần 25%, 1 voucher/đơn), không đụng voucher thường/referral/spin.
- **Kích hoạt là additive & idempotent:** re-evaluate chỉ khi status hiện tại là `PENDING` hoặc `WAITING_APPROVAL`; `ACTIVE`/`REJECTED` là chốt.

---

## File Structure

**Backend (`backend-nestjs/`)**
- `prisma/schema.prisma` — thêm enum `ApprovalMode`, `Voucher.approvalMode`, `UserVoucher.approvedAt/approvedById`, `Order.isExchange`.
- `prisma/migrations/20260708100000_order_voucher_lifecycle/migration.sql` — migration additive.
- `src/vouchers/vouchers.service.ts` — engine kích hoạt (`syncOrderVoucherActivation`, `getCodActivationThreshold`), `approveOrderVoucher`, `getOrderVoucherStatus`, `sendLoginOtp`, `verifyLoginOtp`; mở rộng `createOrderVoucher` (+`approvalMode`, +tạo `UserVoucher` PENDING) và `getOrderVoucher` (+`userVoucher`); guard lazy-activate trong `getUserVouchers`.
- `src/vouchers/vouchers.controller.ts` — thêm route approve + read-status; mở rộng body `create-order-voucher`.
- `src/vouchers/order-voucher-activation.spec.ts` — **mới**, unit test state machine + ngưỡng COD.
- `src/orders/orders.service.ts` — hook `syncOrderVoucherActivation` trong `updateStatus`; `updateAdminFields` xử lý `isExchange` + prepend note.
- `src/orders/orders.service.spec.ts` — bổ sung test hook.
- `src/vouchers/voucher.processor.ts` — cron delegate sang engine (lưới an toàn).
- `src/auth/auth.service.ts` — `loginWithPhoneOtp`.
- `src/auth/auth.controller.ts` — route `send-login-otp`, `otp-login` (set cookie).

**Frontend (`frontend/`)**
- `src/components/admin/CreateOrderVoucherButton.tsx` — thêm `approvalMode`, trạng thái UserVoucher, nút Duyệt.
- `src/components/admin/OrderInfoClient.tsx` — ô tích "Đơn đổi" + đưa `isExchange` vào action `order-info`.
- `src/components/ccm/CcmViettelPushDialog.tsx` — prefill `orderNote` từ `order.note` (đẩy marker Đơn đổi sang VTP).
- `src/app/portal/orders/[id]/OrderDetailClient.tsx` — block trạng thái voucher thưởng của đơn.
- `src/app/admin/customers/[id]/page.tsx` — fix bug `'PERCENTAGE'`→`'PERCENT'`, thêm status/sourceOrderCode/unlockAt.
- `src/app/portal/vouchers/page.tsx` — nhãn `WAITING_APPROVAL`.
- `src/app/portal/voucher-status/page.tsx` — **mới**, trang QR xem trạng thái (bảo vệ bằng layout portal).
- `src/app/admin/admin.service.ts` (backend `src/admin/admin.service.ts`) — select thêm `status/sourceOrderCode/unlockAt`.

---

## Task 1: Migration + Schema (data model)

**Files:**
- Modify: `backend-nestjs/prisma/schema.prisma` (Voucher 390–428, UserVoucher 431–451, Order 305–353, enum block ~1091)
- Create: `backend-nestjs/prisma/migrations/20260708100000_order_voucher_lifecycle/migration.sql`

**Interfaces:**
- Produces: enum `ApprovalMode { AUTO MANUAL }`; `Voucher.approvalMode: ApprovalMode @default(AUTO)`; `UserVoucher.approvedAt?: DateTime`, `UserVoucher.approvedById?: String`; `Order.isExchange: Boolean @default(false)`.

- [ ] **Step 1: Thêm enum `ApprovalMode` cạnh `VoucherType`**

Trong `schema.prisma`, ngay trên khối `enum VoucherType {` (dòng ~1091) thêm:

```prisma
enum ApprovalMode {
  AUTO
  MANUAL
}
```

- [ ] **Step 2: Thêm field vào `Voucher`**

Trong khối `model Voucher` (trước dòng `@@index([storeId])` ở 427), sau dòng `status String @default("AUTO")` (418) thêm:

```prisma
  approvalMode       ApprovalMode     @default(AUTO) @map("approval_mode")
```

- [ ] **Step 3: Thêm field vào `UserVoucher`**

Trong khối `model UserVoucher` (trước `@@index([userId, voucherId])` ở 446), sau dòng `status String @default("ACTIVE")` (440) thêm:

```prisma
  approvedAt      DateTime?      @map("approved_at")
  approvedById    String?        @map("approved_by_id")
```

- [ ] **Step 4: Thêm field vào `Order`**

Trong khối `model Order`, cạnh nhóm discount (sau dòng `shippingDiscount Float @default(0) @map("shipping_discount")` ở 318) thêm:

```prisma
  isExchange       Boolean @default(false) @map("is_exchange")
```

- [ ] **Step 5: Viết migration.sql thủ công**

Tạo `backend-nestjs/prisma/migrations/20260708100000_order_voucher_lifecycle/migration.sql`:

```sql
-- Voucher đơn: chế độ duyệt (AUTO = tự kích hoạt khi đủ điều kiện; MANUAL = chờ admin duyệt).
ALTER TABLE `vouchers` ADD COLUMN `approval_mode` ENUM('AUTO', 'MANUAL') NOT NULL DEFAULT 'AUTO';

-- UserVoucher: dấu vết duyệt thủ công.
ALTER TABLE `user_vouchers` ADD COLUMN `approved_at` DATETIME(3) NULL;
ALTER TABLE `user_vouchers` ADD COLUMN `approved_by_id` VARCHAR(191) NULL;

-- Cờ "Đơn đổi": bật thì chặn kích hoạt voucher + ghép marker vào ghi chú đơn.
ALTER TABLE `orders` ADD COLUMN `is_exchange` BOOLEAN NOT NULL DEFAULT false;
```

- [ ] **Step 6: Áp migration + regenerate client**

Run: `cd backend-nestjs && npx prisma migrate deploy && npx prisma generate`
Expected: `Applying migration 20260708100000_order_voucher_lifecycle` rồi `Generated Prisma Client`. Không lỗi.

(Nếu DB local drift khiến `migrate deploy` từ chối, dùng `npx prisma migrate resolve --applied 20260708100000_order_voucher_lifecycle` sau khi chạy SQL tay, hoặc `yarn prisma:migrate` để đồng bộ dev — chỉ khi local.)

- [ ] **Step 7: Commit**

```bash
git add backend-nestjs/prisma/schema.prisma backend-nestjs/prisma/migrations/20260708100000_order_voucher_lifecycle
git commit -m "feat(voucher): schema for order-voucher lifecycle (approvalMode, approvedAt/By, isExchange)"
```

---

## Task 2: Engine kích hoạt + ngưỡng COD (state machine)

**Files:**
- Modify: `backend-nestjs/src/vouchers/vouchers.service.ts` (thêm consts + `getCodActivationThreshold`, `syncOrderVoucherActivation`; guard `getUserVouchers` 828–841)
- Test: `backend-nestjs/src/vouchers/order-voucher-activation.spec.ts` (mới)

**Interfaces:**
- Consumes: `this.prisma.userVoucher.findUnique/update`, `this.prisma.systemConfig.findUnique`, `this.emitUserVoucherLifecycle(id, status, source, payload?)` (đã có, dòng 625).
- Produces:
  - `getCodActivationThreshold(): Promise<number>`
  - `syncOrderVoucherActivation(order: OrderVoucherSyncInput): Promise<{ changed: boolean; status: string } | null>` với `type OrderVoucherSyncInput = { id: string; orderCode: string; status: string; totalAmount: number; isExchange?: boolean }`. Trả `null` nếu đơn không có order-voucher.
  - Consts private: `ORDER_VOUCHER_SUCCESS_STATUSES`, `ORDER_VOUCHER_REJECT_STATUSES`, `DEFAULT_COD_ACTIVATION_THRESHOLD = 100000`.

- [ ] **Step 1: Viết test fail cho state machine**

Tạo `backend-nestjs/src/vouchers/order-voucher-activation.spec.ts`:

```ts
import { VouchersService } from './vouchers.service';

type UV = {
  id: string;
  status: string;
  voucher: { approvalMode: 'AUTO' | 'MANUAL' };
};

function makeDeps(uv: UV | null, threshold = 100000) {
  const updated: any[] = [];
  const prisma = {
    userVoucher: {
      findUnique: jest.fn(async () => uv),
      update: jest.fn(async ({ where, data }: any) => {
        updated.push({ where, data });
        return { id: where.id, status: data.status };
      }),
    },
    systemConfig: {
      findUnique: jest.fn(async () => ({
        key: 'order_voucher_config',
        value: { codActivationThreshold: threshold },
      })),
    },
  } as any;
  const messaging = { handleVoucherCreated: jest.fn(async () => undefined) } as any;
  const svc = new VouchersService(prisma, {} as any, {} as any, messaging);
  return { svc, prisma, updated };
}

const baseOrder = { id: 'o1', orderCode: 'ORD1', status: 'DELIVERED', totalAmount: 200000 };

describe('syncOrderVoucherActivation', () => {
  it('AUTO + delivered + totalAmount >= threshold -> ACTIVE', async () => {
    const { svc, updated } = makeDeps({ id: 'uv1', status: 'PENDING', voucher: { approvalMode: 'AUTO' } });
    const res = await svc.syncOrderVoucherActivation({ ...baseOrder });
    expect(res).toEqual({ changed: true, status: 'ACTIVE' });
    expect(updated[0].data.status).toBe('ACTIVE');
  });

  it('MANUAL + eligible -> WAITING_APPROVAL', async () => {
    const { svc } = makeDeps({ id: 'uv1', status: 'PENDING', voucher: { approvalMode: 'MANUAL' } });
    const res = await svc.syncOrderVoucherActivation({ ...baseOrder });
    expect(res).toEqual({ changed: true, status: 'WAITING_APPROVAL' });
  });

  it('delivered but totalAmount < threshold -> REJECTED', async () => {
    const { svc } = makeDeps({ id: 'uv1', status: 'PENDING', voucher: { approvalMode: 'AUTO' } });
    const res = await svc.syncOrderVoucherActivation({ ...baseOrder, totalAmount: 50000 });
    expect(res).toEqual({ changed: true, status: 'REJECTED' });
  });

  it('CANCELLED -> REJECTED', async () => {
    const { svc } = makeDeps({ id: 'uv1', status: 'PENDING', voucher: { approvalMode: 'AUTO' } });
    const res = await svc.syncOrderVoucherActivation({ ...baseOrder, status: 'CANCELLED' });
    expect(res).toEqual({ changed: true, status: 'REJECTED' });
  });

  it('isExchange=true -> REJECTED even if delivered', async () => {
    const { svc } = makeDeps({ id: 'uv1', status: 'PENDING', voucher: { approvalMode: 'AUTO' } });
    const res = await svc.syncOrderVoucherActivation({ ...baseOrder, isExchange: true });
    expect(res).toEqual({ changed: true, status: 'REJECTED' });
  });

  it('not delivered yet -> stays PENDING (no change)', async () => {
    const { svc, updated } = makeDeps({ id: 'uv1', status: 'PENDING', voucher: { approvalMode: 'AUTO' } });
    const res = await svc.syncOrderVoucherActivation({ ...baseOrder, status: 'SHIPPED' });
    expect(res).toEqual({ changed: false, status: 'PENDING' });
    expect(updated).toHaveLength(0);
  });

  it('already ACTIVE -> no re-evaluation', async () => {
    const { svc, updated } = makeDeps({ id: 'uv1', status: 'ACTIVE', voucher: { approvalMode: 'AUTO' } });
    const res = await svc.syncOrderVoucherActivation({ ...baseOrder, status: 'CANCELLED' });
    expect(res).toEqual({ changed: false, status: 'ACTIVE' });
    expect(updated).toHaveLength(0);
  });

  it('WAITING_APPROVAL then order cancelled -> REJECTED', async () => {
    const { svc } = makeDeps({ id: 'uv1', status: 'WAITING_APPROVAL', voucher: { approvalMode: 'MANUAL' } });
    const res = await svc.syncOrderVoucherActivation({ ...baseOrder, status: 'REFUNDED' });
    expect(res).toEqual({ changed: true, status: 'REJECTED' });
  });

  it('no order-voucher -> null', async () => {
    const { svc } = makeDeps(null);
    const res = await svc.syncOrderVoucherActivation({ ...baseOrder });
    expect(res).toBeNull();
  });

  it('threshold falls back to 100000 when config missing', async () => {
    const { svc } = makeDeps({ id: 'uv1', status: 'PENDING', voucher: { approvalMode: 'AUTO' } });
    (svc as any).prisma.systemConfig.findUnique = jest.fn(async () => null);
    const res = await svc.syncOrderVoucherActivation({ ...baseOrder, totalAmount: 99999 });
    expect(res).toEqual({ changed: true, status: 'REJECTED' });
  });
});
```

- [ ] **Step 2: Chạy test — xác nhận FAIL**

Run: `cd backend-nestjs && yarn test src/vouchers/order-voucher-activation.spec.ts`
Expected: FAIL — `syncOrderVoucherActivation is not a function` / `getCodActivationThreshold`.

- [ ] **Step 3: Thêm consts vào `VouchersService`**

Trong `vouchers.service.ts`, sau dòng `private readonly allowedPaymentMethods = ['COD', 'VIETQR'];` (trước `constructor(`) thêm:

```ts
  private readonly ORDER_VOUCHER_SUCCESS_STATUSES = ['DELIVERED', 'PAYMENT_COLLECTED', 'COMPLETED'];
  private readonly ORDER_VOUCHER_REJECT_STATUSES = ['CANCELLED', 'REFUNDED', 'RETURNING', 'EXCHANGING'];
  private readonly DEFAULT_COD_ACTIVATION_THRESHOLD = 100000;
```

- [ ] **Step 4: Viết `getCodActivationThreshold` + `syncOrderVoucherActivation`**

Thêm 2 method vào `VouchersService` (đặt ngay trên `createOrderVoucher` ở dòng 574):

```ts
  async getCodActivationThreshold(): Promise<number> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'order_voucher_config' },
    });
    const value = config?.value as { codActivationThreshold?: number } | null;
    const threshold = Number(value?.codActivationThreshold);
    return Number.isFinite(threshold) && threshold >= 0
      ? threshold
      : this.DEFAULT_COD_ACTIVATION_THRESHOLD;
  }

  /**
   * State machine kích hoạt voucher riêng của đơn (UserVoucher theo sourceOrderCode).
   * Chỉ re-evaluate khi đang PENDING hoặc WAITING_APPROVAL. ACTIVE/REJECTED là chốt.
   */
  async syncOrderVoucherActivation(order: {
    id: string;
    orderCode: string;
    status: string;
    totalAmount: number;
    isExchange?: boolean;
  }): Promise<{ changed: boolean; status: string } | null> {
    const userVoucher = await this.prisma.userVoucher.findUnique({
      where: { sourceOrderCode: order.orderCode },
      include: { voucher: true },
    });
    if (!userVoucher) return null;

    if (userVoucher.status !== 'PENDING' && userVoucher.status !== 'WAITING_APPROVAL') {
      return { changed: false, status: userVoucher.status };
    }

    const isExchange = order.isExchange === true;
    const isSuccess = this.ORDER_VOUCHER_SUCCESS_STATUSES.includes(order.status);

    let nextStatus: string | null = null;
    if (isExchange || this.ORDER_VOUCHER_REJECT_STATUSES.includes(order.status)) {
      nextStatus = 'REJECTED';
    } else if (isSuccess) {
      const threshold = await this.getCodActivationThreshold();
      if (order.totalAmount < threshold) {
        nextStatus = 'REJECTED';
      } else {
        nextStatus = userVoucher.voucher.approvalMode === 'MANUAL' ? 'WAITING_APPROVAL' : 'ACTIVE';
      }
    }

    if (!nextStatus || nextStatus === userVoucher.status) {
      return { changed: false, status: userVoucher.status };
    }

    const updated = await this.prisma.userVoucher.update({
      where: { id: userVoucher.id },
      data: {
        status: nextStatus,
        ...(nextStatus === 'ACTIVE' ? { unlockAt: new Date() } : {}),
      },
    });
    await this.emitUserVoucherLifecycle(updated.id, updated.status, 'ORDER_VOUCHER_ACTIVATION', {
      orderCode: order.orderCode,
      previousStatus: userVoucher.status,
    });
    return { changed: true, status: updated.status };
  }
```

- [ ] **Step 5: Chạy test — xác nhận PASS**

Run: `cd backend-nestjs && yarn test src/vouchers/order-voucher-activation.spec.ts`
Expected: PASS toàn bộ.

- [ ] **Step 6: Guard lazy-activate trong `getUserVouchers`**

Order-voucher KHÔNG được kích hoạt theo thời gian (`unlockAt`) — chỉ qua engine. Trong `getUserVouchers` (vòng lặp dòng 828–841), sửa điều kiện để bỏ qua order-voucher:

Tìm:
```ts
    for (const uv of vouchers) {
      if (uv.status === 'PENDING' && uv.unlockAt && new Date(uv.unlockAt) <= now) {
```
Thay bằng:
```ts
    for (const uv of vouchers) {
      const isOrderVoucher = uv.voucher?.code?.startsWith('QR-ORDER-');
      if (!isOrderVoucher && uv.status === 'PENDING' && uv.unlockAt && new Date(uv.unlockAt) <= now) {
```

- [ ] **Step 7: Chạy full suite vouchers — xác nhận không hỏng**

Run: `cd backend-nestjs && yarn test src/vouchers/order-voucher-activation.spec.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend-nestjs/src/vouchers/vouchers.service.ts backend-nestjs/src/vouchers/order-voucher-activation.spec.ts
git commit -m "feat(voucher): activation engine + COD threshold state machine"
```

---

## Task 3: Hook engine vào `updateStatus` + cron delegate

**Files:**
- Modify: `backend-nestjs/src/orders/orders.service.ts` (`updateStatus` sau hook credits, ~2050)
- Modify: `backend-nestjs/src/vouchers/voucher.processor.ts` (`verifyAndUpdateVoucher` 274–306)
- Test: `backend-nestjs/src/orders/orders.service.spec.ts` (bổ sung)

**Interfaces:**
- Consumes: `this.vouchersService.syncOrderVoucherActivation(order)` (Task 2).
- Produces: `updateStatus` gọi engine với `{ id, orderCode, status, totalAmount, isExchange }` của đơn sau update.

- [ ] **Step 1: Viết test fail — updateStatus gọi engine**

Trong `backend-nestjs/src/orders/orders.service.spec.ts`, thêm block (dùng pattern `new OrdersService(...)` sẵn có; 7 tham số):

```ts
describe('updateStatus -> order voucher activation', () => {
  it('calls syncOrderVoucherActivation with the updated order', async () => {
    const updatedOrder = {
      id: 'o1',
      orderCode: 'ORD1',
      status: 'DELIVERED',
      totalAmount: 200000,
      isExchange: false,
      paymentStatus: 'UNPAID',
    };
    const prisma: any = {
      order: {
        update: jest.fn(async () => updatedOrder),
      },
    };
    const vouchersService: any = { syncOrderVoucherActivation: jest.fn(async () => ({ changed: true, status: 'ACTIVE' })) };
    const messaging: any = { handleOrderStateChange: jest.fn(), handleVoucherCreated: jest.fn() };
    const adminNotif: any = { createNotification: jest.fn() };
    const svc = new OrdersService(
      prisma,
      vouchersService,
      {} as any,
      {} as any,
      adminNotif,
      messaging,
      {} as any,
    );
    // stub các phương thức phụ để cô lập
    (svc as any).findOne = jest.fn(async () => ({ ...updatedOrder, status: 'SHIPPED', paymentStatus: 'UNPAID' }));
    (svc as any).applyDeliveredCredits = jest.fn(async () => undefined);
    (svc as any).releaseAppliedVouchersForOrder = jest.fn(async () => undefined);
    (svc as any).revertDeliveredCredits = jest.fn(async () => undefined);

    await svc.updateStatus('o1', { status: 'DELIVERED' } as any, 'admin1', 'ADMIN', null);

    expect(vouchersService.syncOrderVoucherActivation).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'o1', orderCode: 'ORD1', status: 'DELIVERED', totalAmount: 200000, isExchange: false }),
    );
  });
});
```

- [ ] **Step 2: Chạy test — xác nhận FAIL**

Run: `cd backend-nestjs && yarn test src/orders/orders.service.spec.ts -t "order voucher activation"`
Expected: FAIL — `syncOrderVoucherActivation` chưa được gọi.

- [ ] **Step 3: Thêm hook trong `updateStatus`**

Trong `orders.service.ts`, sau block credits (ngay sau dòng `if (isCancelled) { await this.revertDeliveredCredits(currentOrder); }` ~2059) thêm:

```ts
    // Đồng bộ kích hoạt voucher riêng của đơn (nguồn chính — không phụ thuộc Redis/cron).
    try {
      await this.vouchersService.syncOrderVoucherActivation({
        id: updatedOrder.id,
        orderCode: updatedOrder.orderCode,
        status: updatedOrder.status,
        totalAmount: updatedOrder.totalAmount,
        isExchange: (updatedOrder as any).isExchange === true,
      });
    } catch (err) {
      this.logger.error(
        `syncOrderVoucherActivation failed for order ${updatedOrder.orderCode}: ${this.getErrorMessage(err)}`,
      );
    }
```

- [ ] **Step 4: Chạy test — xác nhận PASS**

Run: `cd backend-nestjs && yarn test src/orders/orders.service.spec.ts -t "order voucher activation"`
Expected: PASS.

- [ ] **Step 5: Cron delegate (lưới an toàn)**

Trong `voucher.processor.ts` `verifyAndUpdateVoucher` (điều kiện kích hoạt 274–306), thay logic tự set `ACTIVE`/`REJECTED` bằng gọi engine chung. Tìm khối cập nhật (chỗ `userVoucher.update({ data: { status: 'ACTIVE' } })` và nhánh REJECTED) và thay bằng:

```ts
    // Uỷ quyền cho state machine chuẩn (đọc order.status + totalAmount + isExchange + approvalMode).
    const order = await this.prisma.order.findFirst({
      where: { orderCode },
      select: { id: true, orderCode: true, status: true, totalAmount: true, isExchange: true },
    });
    if (order) {
      await this.vouchersService.syncOrderVoucherActivation(order);
    }
```

(Giữ nguyên phần chọn batch `status: 'PENDING'`/`WAITING_APPROVAL`. Nếu batch hiện chỉ lấy `PENDING`, mở rộng where thành `status: { in: ['PENDING', 'WAITING_APPROVAL'] }` để cron cũng dọn các đơn hỏng sau khi đã WAITING_APPROVAL. Bỏ import/biến `isDeliveredPaidOrder` nếu chỉ hàm này dùng — nếu còn nơi khác dùng thì giữ.)

- [ ] **Step 6: Build check**

Run: `cd backend-nestjs && npx tsc --noEmit -p tsconfig.json`
Expected: không lỗi type ở `orders.service.ts` / `voucher.processor.ts`.

- [ ] **Step 7: Commit**

```bash
git add backend-nestjs/src/orders/orders.service.ts backend-nestjs/src/orders/orders.service.spec.ts backend-nestjs/src/vouchers/voucher.processor.ts
git commit -m "feat(voucher): hook activation engine into updateStatus + cron delegate"
```

---

## Task 4: `createOrderVoucher` — +approvalMode + tạo UserVoucher PENDING

**Files:**
- Modify: `backend-nestjs/src/vouchers/vouchers.service.ts` (`createOrderVoucher` 574–674, `getOrderVoucher` 679–688)
- Modify: `backend-nestjs/src/vouchers/vouchers.controller.ts` (body `create-order-voucher` 170–187)
- Test: `backend-nestjs/src/vouchers/order-voucher-activation.spec.ts` (bổ sung)

**Interfaces:**
- Consumes: `prisma.order.findUnique` (thêm `userId` vào select), `prisma.voucher.create`, `prisma.userVoucher.create`.
- Produces: `createOrderVoucher` data thêm `approvalMode?: 'AUTO' | 'MANUAL'`; voucher lưu `approvalMode`; nếu `order.userId` có → tạo `UserVoucher` `status='PENDING'`, `sourceOrderCode=orderCode`. `getOrderVoucher` trả thêm `userVoucher: { id, status, approvedAt } | null`.

- [ ] **Step 1: Test fail — tạo voucher AUTO/MANUAL + UserVoucher PENDING**

Bổ sung vào `order-voucher-activation.spec.ts`:

```ts
describe('createOrderVoucher', () => {
  function makeSvc() {
    const created: any = {};
    const prisma: any = {
      order: { findUnique: jest.fn(async () => ({ id: 'o1', orderCode: 'ORD1', totalAmount: 200000, storeId: null, userId: 'u1' })) },
      voucher: {
        findUnique: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => { created.voucher = data; return { id: 'v1', ...data }; }),
      },
      userVoucher: { create: jest.fn(async ({ data }: any) => { created.userVoucher = data; return { id: 'uv1', ...data }; }) },
      systemConfig: { findUnique: jest.fn(async () => null) },
    };
    const svc = new VouchersService(prisma, {} as any, {} as any, { handleVoucherCreated: jest.fn() } as any);
    return { svc, prisma, created };
  }

  it('MANUAL: stores approvalMode on voucher and creates PENDING UserVoucher', async () => {
    const { svc, created, prisma } = makeSvc();
    await svc.createOrderVoucher({ orderId: 'o1', type: 'PERCENT', value: 10, approvalMode: 'MANUAL' });
    expect(created.voucher.approvalMode).toBe('MANUAL');
    expect(prisma.userVoucher.create).toHaveBeenCalledTimes(1);
    expect(created.userVoucher).toEqual(expect.objectContaining({ userId: 'u1', voucherId: 'v1', sourceOrderCode: 'ORD1', status: 'PENDING', isUsed: false }));
  });

  it('defaults approvalMode to AUTO', async () => {
    const { svc, created } = makeSvc();
    await svc.createOrderVoucher({ orderId: 'o1', type: 'FIXED_AMOUNT', value: 50000 });
    expect(created.voucher.approvalMode).toBe('AUTO');
  });

  it('skips UserVoucher when order has no userId', async () => {
    const { svc, prisma } = makeSvc();
    prisma.order.findUnique = jest.fn(async () => ({ id: 'o1', orderCode: 'ORD1', totalAmount: 200000, storeId: null, userId: null }));
    await svc.createOrderVoucher({ orderId: 'o1', type: 'FIXED_AMOUNT', value: 50000 });
    expect(prisma.userVoucher.create).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy test — FAIL**

Run: `cd backend-nestjs && yarn test src/vouchers/order-voucher-activation.spec.ts -t "createOrderVoucher"`
Expected: FAIL — `approvalMode` không được lưu / `userVoucher.create` không được gọi.

- [ ] **Step 3: Sửa signature + select userId + lưu approvalMode + tạo UserVoucher**

Trong `createOrderVoucher`:

(a) Thêm `approvalMode` vào type data (sau `stackTiers?: any;`):
```ts
      stackTiers?: any;
      approvalMode?: 'AUTO' | 'MANUAL';
```

(b) Destructure thêm `approvalMode`:
```ts
      perCustomerLimit,
      stackTiers,
      approvalMode,
    } = data;
```

(c) Thêm `userId` vào select order:
```ts
      select: { id: true, orderCode: true, totalAmount: true, storeId: true, userId: true },
```

(d) Trong `prisma.voucher.create({ data: {...} })`, thêm dòng (sau `storeId: order.storeId || null,`):
```ts
        approvalMode: approvalMode === 'MANUAL' ? 'MANUAL' : 'AUTO',
```

(e) Ngay sau `const voucher = await this.prisma.voucher.create(...)` và trước `this.logger.log(...)`, thêm tạo UserVoucher PENDING:
```ts
    // Voucher tự vào ví khách ở trạng thái CHỜ (chỉ khi đơn đã gắn User).
    if (order.userId) {
      const expiresAt = durationDays
        ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const userVoucher = await this.prisma.userVoucher.create({
        data: {
          userId: order.userId,
          voucherId: voucher.id,
          sourceOrderCode: order.orderCode,
          status: 'PENDING',
          expiresAt,
          isUsed: false,
        },
      });
      await this.emitUserVoucherLifecycle(userVoucher.id, 'PENDING', 'ORDER_VOUCHER_CREATED', {
        orderCode: order.orderCode,
      });
    }
```

- [ ] **Step 4: Mở rộng `getOrderVoucher` trả kèm userVoucher**

Thay body `getOrderVoucher` (679–688) bằng:
```ts
  async getOrderVoucher(orderCode: string, user?: any, effectiveStoreId?: string | null) {
    const voucher = await this.prisma.voucher.findFirst({
      where: {
        code: `QR-ORDER-${orderCode}`,
        ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
      },
    });

    let userVoucher: { id: string; status: string; approvedAt: Date | null } | null = null;
    if (voucher) {
      userVoucher = await this.prisma.userVoucher.findUnique({
        where: { sourceOrderCode: orderCode },
        select: { id: true, status: true, approvedAt: true },
      });
    }

    return { exists: !!voucher, voucher: voucher || null, userVoucher };
  }
```

- [ ] **Step 5: Controller — thêm `approvalMode` vào body**

Trong `vouchers.controller.ts` `createOrderVoucher` (body 173–184), thêm:
```ts
    stackTiers?: any;
    approvalMode?: 'AUTO' | 'MANUAL';
  },
```

- [ ] **Step 6: Chạy test — PASS**

Run: `cd backend-nestjs && yarn test src/vouchers/order-voucher-activation.spec.ts`
Expected: PASS toàn bộ (state machine + createOrderVoucher).

- [ ] **Step 7: Commit**

```bash
git add backend-nestjs/src/vouchers/vouchers.service.ts backend-nestjs/src/vouchers/vouchers.controller.ts backend-nestjs/src/vouchers/order-voucher-activation.spec.ts
git commit -m "feat(voucher): create-order-voucher stores approvalMode + creates PENDING UserVoucher"
```

---

## Task 5: Endpoint Duyệt Manual

**Files:**
- Modify: `backend-nestjs/src/vouchers/vouchers.service.ts` (thêm `approveOrderVoucher`)
- Modify: `backend-nestjs/src/vouchers/vouchers.controller.ts` (route approve, đặt gần `create-order-voucher`)
- Test: `backend-nestjs/src/vouchers/order-voucher-activation.spec.ts` (bổ sung)

**Interfaces:**
- Produces: `approveOrderVoucher(userVoucherId: string, adminId: string): Promise<{ success: boolean; status: string }>` — chỉ chuyển `WAITING_APPROVAL → ACTIVE`, set `approvedAt`, `approvedById`. Route: `POST /vouchers/order-voucher/:userVoucherId/approve` (ADMIN/MODERATOR).

- [ ] **Step 1: Test fail**

Bổ sung vào `order-voucher-activation.spec.ts`:

```ts
describe('approveOrderVoucher', () => {
  function makeSvc(status: string) {
    const prisma: any = {
      userVoucher: {
        findUnique: jest.fn(async () => ({ id: 'uv1', status })),
        update: jest.fn(async ({ data }: any) => ({ id: 'uv1', ...data })),
      },
    };
    const svc = new VouchersService(prisma, {} as any, {} as any, { handleVoucherCreated: jest.fn() } as any);
    return { svc, prisma };
  }

  it('WAITING_APPROVAL -> ACTIVE with audit fields', async () => {
    const { svc, prisma } = makeSvc('WAITING_APPROVAL');
    const res = await svc.approveOrderVoucher('uv1', 'admin1');
    expect(res).toEqual({ success: true, status: 'ACTIVE' });
    const arg = prisma.userVoucher.update.mock.calls[0][0].data;
    expect(arg.status).toBe('ACTIVE');
    expect(arg.approvedById).toBe('admin1');
    expect(arg.approvedAt).toBeInstanceOf(Date);
  });

  it('rejects when not WAITING_APPROVAL', async () => {
    const { svc } = makeSvc('PENDING');
    await expect(svc.approveOrderVoucher('uv1', 'admin1')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Chạy test — FAIL**

Run: `cd backend-nestjs && yarn test src/vouchers/order-voucher-activation.spec.ts -t "approveOrderVoucher"`
Expected: FAIL — `approveOrderVoucher is not a function`.

- [ ] **Step 3: Viết `approveOrderVoucher`**

Thêm vào `VouchersService` (dưới `syncOrderVoucherActivation`):

```ts
  async approveOrderVoucher(userVoucherId: string, adminId: string) {
    const uv = await this.prisma.userVoucher.findUnique({ where: { id: userVoucherId } });
    if (!uv) throw new NotFoundException('Không tìm thấy voucher của khách');
    if (uv.status !== 'WAITING_APPROVAL') {
      throw new BadRequestException('Voucher không ở trạng thái chờ duyệt');
    }
    const updated = await this.prisma.userVoucher.update({
      where: { id: userVoucherId },
      data: { status: 'ACTIVE', approvedAt: new Date(), approvedById: adminId, unlockAt: new Date() },
    });
    await this.emitUserVoucherLifecycle(updated.id, 'ACTIVE', 'ORDER_VOUCHER_MANUAL_APPROVED', {
      approvedById: adminId,
    });
    return { success: true, status: updated.status };
  }
```

- [ ] **Step 4: Controller route**

Trong `vouchers.controller.ts`, ngay sau endpoint `create-order-voucher` (kết thúc ~dòng 187) thêm:

```ts
  @Post('order-voucher/:userVoucherId/approve')
  @Roles('ADMIN', 'MODERATOR')
  @Permissions(Permission.VOUCHERS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Duyệt voucher đơn (WAITING_APPROVAL -> ACTIVE)' })
  async approveOrderVoucher(
    @Param('userVoucherId') userVoucherId: string,
    @GetUser('id') adminId: string,
  ) {
    return this.vouchersService.approveOrderVoucher(userVoucherId, adminId);
  }
```

- [ ] **Step 5: Chạy test — PASS**

Run: `cd backend-nestjs && yarn test src/vouchers/order-voucher-activation.spec.ts -t "approveOrderVoucher"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend-nestjs/src/vouchers/vouchers.service.ts backend-nestjs/src/vouchers/vouchers.controller.ts backend-nestjs/src/vouchers/order-voucher-activation.spec.ts
git commit -m "feat(voucher): manual approve endpoint (WAITING_APPROVAL -> ACTIVE)"
```

---

## Task 6: Cờ "Đơn đổi" — lưu + prepend note + đẩy VTP

**Files:**
- Modify: `backend-nestjs/src/orders/orders.service.ts` (`updateAdminFields` 1584–1669)
- Modify: `frontend/src/components/ccm/CcmViettelPushDialog.tsx` (interface + init orderNote)
- Test: `backend-nestjs/src/orders/orders.service.spec.ts` (bổ sung)

**Interfaces:**
- Consumes: `updateAdminFields` body (thêm `isExchange?: boolean`).
- Produces: khi `isExchange=true` → `updateData.isExchange=true` và prepend `"[ĐƠN ĐỔI] "` vào `order.note` (idempotent, không lặp prefix); khi `false` → gỡ prefix. `PushableOrder` FE thêm `note?: string | null`; dialog init `orderNote` từ `order.note`.

- [ ] **Step 1: Test fail — updateAdminFields xử lý isExchange + note**

Bổ sung vào `orders.service.spec.ts`:

```ts
describe('updateAdminFields -> isExchange', () => {
  function makeSvc(order: any) {
    const captured: any = {};
    const prisma: any = {
      order: {
        findUnique: jest.fn(async () => order),
        update: jest.fn(async ({ data }: any) => { captured.data = data; return { ...order, ...data }; }),
      },
    };
    const svc = new OrdersService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    return { svc, captured };
  }

  it('sets isExchange and prepends marker to note (once)', async () => {
    const { svc, captured } = makeSvc({ id: 'o1', storeId: null, subtotal: 0, shippingFee: 0, discountAmount: 0, metadata: {}, note: 'Giao giờ hành chính' });
    await svc.updateAdminFields('o1', { isExchange: true }, 'admin1', 'ADMIN', null);
    expect(captured.data.isExchange).toBe(true);
    expect(captured.data.note).toBe('[ĐƠN ĐỔI] Giao giờ hành chính');
  });

  it('does not duplicate the marker', async () => {
    const { svc, captured } = makeSvc({ id: 'o1', storeId: null, subtotal: 0, shippingFee: 0, discountAmount: 0, metadata: {}, note: '[ĐƠN ĐỔI] Giao giờ hành chính' });
    await svc.updateAdminFields('o1', { isExchange: true }, 'admin1', 'ADMIN', null);
    expect(captured.data.note).toBe('[ĐƠN ĐỔI] Giao giờ hành chính');
  });

  it('removes marker when isExchange=false', async () => {
    const { svc, captured } = makeSvc({ id: 'o1', storeId: null, subtotal: 0, shippingFee: 0, discountAmount: 0, metadata: {}, note: '[ĐƠN ĐỔI] Giao giờ hành chính' });
    await svc.updateAdminFields('o1', { isExchange: false }, 'admin1', 'ADMIN', null);
    expect(captured.data.isExchange).toBe(false);
    expect(captured.data.note).toBe('Giao giờ hành chính');
  });
});
```

- [ ] **Step 2: Chạy test — FAIL**

Run: `cd backend-nestjs && yarn test src/orders/orders.service.spec.ts -t "isExchange"`
Expected: FAIL — `isExchange` không có trong updateData.

- [ ] **Step 3: Sửa `updateAdminFields`**

(a) Thêm vào type body (sau `customerTags?: string[];`):
```ts
      customerTags?: string[];
      isExchange?: boolean;
```

(b) Ngay trước `updateData.metadata = existingMeta;` (cuối hàm, sau các gán meta) thêm:
```ts
    const EXCHANGE_MARKER = '[ĐƠN ĐỔI] ';
    if (body.isExchange !== undefined) {
      updateData.isExchange = body.isExchange;
      const currentNote = order.note || '';
      const stripped = currentNote.startsWith(EXCHANGE_MARKER)
        ? currentNote.slice(EXCHANGE_MARKER.length)
        : currentNote;
      updateData.note = body.isExchange ? `${EXCHANGE_MARKER}${stripped}` : stripped;
    }
```

- [ ] **Step 4: Chạy test — PASS**

Run: `cd backend-nestjs && yarn test src/orders/orders.service.spec.ts -t "isExchange"`
Expected: PASS.

- [ ] **Step 5: FE — đẩy note (kèm marker) sang VTP**

Trong `CcmViettelPushDialog.tsx`:

(a) Thêm `note` vào interface `PushableOrder` (sau `items: {...}[];`):
```ts
  items: { name: string; quantity: number }[];
  note?: string | null;
```

(b) Sửa init state `orderNote` (dòng `const [orderNote, setOrderNote] = useState('');`):
```ts
  const [orderNote, setOrderNote] = useState(order.note ?? '');
```

- [ ] **Step 6: Kiểm chứng thủ công FE**

Chạy FE + BE local. URL: `/admin/orders/<id>` → bật ô "Đơn đổi" (Task 8) → Lưu → mở lại đơn: ghi chú nội bộ có tiền tố `[ĐƠN ĐỔI]`. Vào `/ccm/orders` bấm "Đẩy VTP" cho đơn đó → textarea Ghi chú đơn hiển thị sẵn nội dung note (kèm `[ĐƠN ĐỔI]`).
Expected: đúng như trên.

- [ ] **Step 7: Commit**

```bash
git add backend-nestjs/src/orders/orders.service.ts backend-nestjs/src/orders/orders.service.spec.ts frontend/src/components/ccm/CcmViettelPushDialog.tsx
git commit -m "feat(order): isExchange flag -> note marker + VTP prefill"
```

---

## Task 7: Endpoint đọc trạng thái voucher qua QR (scoped theo user)

**Files:**
- Modify: `backend-nestjs/src/vouchers/vouchers.service.ts` (thêm `getOrderVoucherStatus`)
- Modify: `backend-nestjs/src/vouchers/vouchers.controller.ts` (route GET, đặt TRƯỚC `@Get(':id')`)
- Test: `backend-nestjs/src/vouchers/order-voucher-activation.spec.ts` (bổ sung)

**Interfaces:**
- Produces: `getOrderVoucherStatus(orderCode: string, userId: string): Promise<{ exists: boolean; status: string | null; sourceOrderCode: string | null; unlockAt: Date | null; expiresAt: Date | null; voucher: { code: string; name: string; type: string; value: number; maxDiscount: number | null } | null }>`. Chỉ trả dữ liệu nếu `userVoucher.userId === userId`; ngược lại `exists:false`. Route: `GET /vouchers/order-voucher-status/:orderCode` (authenticated, không `@Public`).

- [ ] **Step 1: Test fail**

Bổ sung vào `order-voucher-activation.spec.ts`:

```ts
describe('getOrderVoucherStatus', () => {
  function makeSvc(uv: any) {
    const prisma: any = { userVoucher: { findUnique: jest.fn(async () => uv) } };
    const svc = new VouchersService(prisma, {} as any, {} as any, { handleVoucherCreated: jest.fn() } as any);
    return svc;
  }

  it('returns status for the owner', async () => {
    const svc = makeSvc({
      userId: 'u1', status: 'PENDING', sourceOrderCode: 'ORD1', unlockAt: null, expiresAt: null,
      voucher: { code: 'QR-ORDER-ORD1', name: 'V', type: 'PERCENT', value: 10, maxDiscount: null },
    });
    const res = await svc.getOrderVoucherStatus('ORD1', 'u1');
    expect(res.exists).toBe(true);
    expect(res.status).toBe('PENDING');
    expect(res.voucher?.code).toBe('QR-ORDER-ORD1');
  });

  it('hides voucher from non-owner', async () => {
    const svc = makeSvc({ userId: 'other', status: 'ACTIVE', voucher: { code: 'QR-ORDER-ORD1' } });
    const res = await svc.getOrderVoucherStatus('ORD1', 'u1');
    expect(res.exists).toBe(false);
    expect(res.voucher).toBeNull();
  });

  it('exists=false when none', async () => {
    const svc = makeSvc(null);
    const res = await svc.getOrderVoucherStatus('ORD1', 'u1');
    expect(res.exists).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test — FAIL**

Run: `cd backend-nestjs && yarn test src/vouchers/order-voucher-activation.spec.ts -t "getOrderVoucherStatus"`
Expected: FAIL.

- [ ] **Step 3: Viết `getOrderVoucherStatus`**

Thêm vào `VouchersService` (dưới `getOrderVoucher`):

```ts
  async getOrderVoucherStatus(orderCode: string, userId: string) {
    const empty = {
      exists: false,
      status: null as string | null,
      sourceOrderCode: null as string | null,
      unlockAt: null as Date | null,
      expiresAt: null as Date | null,
      voucher: null as
        | { code: string; name: string; type: string; value: number; maxDiscount: number | null }
        | null,
    };
    const uv = await this.prisma.userVoucher.findUnique({
      where: { sourceOrderCode: orderCode },
      include: {
        voucher: { select: { code: true, name: true, type: true, value: true, maxDiscount: true } },
      },
    });
    if (!uv || uv.userId !== userId) return empty;
    return {
      exists: true,
      status: uv.status,
      sourceOrderCode: uv.sourceOrderCode,
      unlockAt: uv.unlockAt,
      expiresAt: uv.expiresAt,
      voucher: uv.voucher,
    };
  }
```

- [ ] **Step 4: Controller route (trước `@Get(':id')`)**

Trong `vouchers.controller.ts`, ngay dưới endpoint `order-voucher/:orderCode` (kết thúc ~113) và TRƯỚC comment `// --- :id routes MUST be last among GETs ---`, thêm:

```ts
  @Get('order-voucher-status/:orderCode')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Khách xem trạng thái voucher riêng của đơn (theo phiên đăng nhập)' })
  async getOrderVoucherStatus(
    @Param('orderCode') orderCode: string,
    @GetUser('id') userId: string,
  ) {
    return this.vouchersService.getOrderVoucherStatus(orderCode, userId);
  }
```

- [ ] **Step 5: Chạy test — PASS**

Run: `cd backend-nestjs && yarn test src/vouchers/order-voucher-activation.spec.ts -t "getOrderVoucherStatus"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend-nestjs/src/vouchers/vouchers.service.ts backend-nestjs/src/vouchers/vouchers.controller.ts backend-nestjs/src/vouchers/order-voucher-activation.spec.ts
git commit -m "feat(voucher): owner-scoped order-voucher status endpoint for QR page"
```

---

## Task 8: FE Admin — form voucher inline (+approvalMode, +status, +Duyệt) + ô Đơn đổi

**Files:**
- Modify: `frontend/src/components/admin/CreateOrderVoucherButton.tsx`
- Modify: `frontend/src/components/admin/OrderInfoClient.tsx`

**Interfaces:**
- Consumes: `GET /vouchers/order-voucher/:orderCode` (giờ trả `{ exists, voucher, userVoucher }`), `POST /vouchers/create-order-voucher` (+`approvalMode`), `PATCH /vouchers/:id` (+`approvalMode`), `POST /vouchers/order-voucher/:userVoucherId/approve`, `PATCH /orders/:id/admin-update` (+`isExchange`).

- [ ] **Step 1: `CreateOrderVoucherButton` — types + state cho approvalMode & userVoucher**

(a) `interface OrderVoucher` (29–40): thêm `approvalMode?: 'AUTO' | 'MANUAL';`
(b) `interface OrderVoucherLookupResponse` (42–45): thay bằng
```ts
interface OrderVoucherLookupResponse {
  exists: boolean;
  voucher: OrderVoucher | null;
  userVoucher: { id: string; status: string; approvedAt: string | null } | null;
}
```
(c) `interface VoucherMutationPayload` (52–62): thêm `approvalMode?: 'AUTO' | 'MANUAL';`
(d) State (sau `customUsageLimit`, dòng 83):
```ts
  const [customApprovalMode, setCustomApprovalMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [orderUserVoucher, setOrderUserVoucher] = useState<{ id: string; status: string } | null>(null);
```
(e) Trong `useEffect` lookup (`.then`), lưu userVoucher:
```ts
        setExistingVoucher(res.exists ? res.voucher : null);
        setOrderUserVoucher(res.exists ? res.userVoucher : null);
```

- [ ] **Step 2: Đưa approvalMode vào POST/PATCH + prefill edit**

(a) PATCH body (sau dòng 133 `body.perCustomerLimit = ...`):
```ts
        body.approvalMode = customApprovalMode;
```
(b) POST body (sau dòng 151 `if (customUsageLimit) ...`):
```ts
        body.approvalMode = customApprovalMode;
```
(c) `handleEditClick` (sau dòng 194): 
```ts
    setCustomApprovalMode(existingVoucher.approvalMode || 'AUTO');
```

- [ ] **Step 3: UI — Select Duyệt tự động/thủ công trong form**

Trong khối grid cuối form (sau div "Giới hạn số lượng dùng / user", trước `</div>` đóng grid ở dòng 497) thêm 1 field:

```tsx
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Chế độ duyệt</label>
                  <Select
                    value={customApprovalMode}
                    onChange={(val) => setCustomApprovalMode(val as 'AUTO' | 'MANUAL')}
                    className="w-full bg-white"
                    options={[
                      { value: 'AUTO', label: 'Tự động (khi giao thành công)' },
                      { value: 'MANUAL', label: 'Thủ công (admin duyệt)' },
                    ]}
                  />
                </div>
```

- [ ] **Step 4: UI — trạng thái + nút Duyệt ở card voucher đã có**

Thêm hàm approve trong component (cạnh `handleDelete`):
```ts
  async function handleApprove() {
    if (!orderUserVoucher) return;
    setLoading(true);
    try {
      await apiClientClient.post(`/vouchers/order-voucher/${orderUserVoucher.id}/approve`, {});
      alert('Đã duyệt voucher!');
      setOrderUserVoucher({ ...orderUserVoucher, status: 'ACTIVE' });
    } catch (error: unknown) {
      alert(getErrorMessage(error, 'Lỗi duyệt voucher'));
    } finally {
      setLoading(false);
    }
  }

  const STATUS_LABEL: Record<string, string> = {
    PENDING: '🕒 Chờ kích hoạt',
    WAITING_APPROVAL: '⏳ Chờ duyệt',
    ACTIVE: '✅ Đã kích hoạt',
    REJECTED: '❌ Từ chối',
  };
```

Trong khối `existingVoucher && !showForm` (sau div "space-y-2 text-sm" đóng ở dòng 279, trước `</div>` đóng bg-green-50 ở 280) thêm:
```tsx
            {orderUserVoucher && (
              <div className="flex items-center justify-between border-t border-green-200 pt-2 mt-2">
                <span className="text-gray-600 text-sm">Trạng thái ví khách:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">
                    {STATUS_LABEL[orderUserVoucher.status] || orderUserVoucher.status}
                  </span>
                  {orderUserVoucher.status === 'WAITING_APPROVAL' && (
                    <button
                      onClick={handleApprove}
                      disabled={loading}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-md disabled:opacity-50"
                    >
                      Duyệt
                    </button>
                  )}
                </div>
              </div>
            )}
```

- [ ] **Step 5: `OrderInfoClient` — ô tích "Đơn đổi"**

(a) `interface OrderInfoOrder` (thêm sau `createdAt`):
```ts
  isExchange?: boolean | null;
```
(b) State (sau `const [delayValue, ...]`):
```ts
  const [isExchange, setIsExchange] = useState<boolean>(order.isExchange === true);
```
(c) Action `order-info` (body PATCH admin-update) — thêm `isExchange` và deps:
```ts
    registerSaveAction('order-info', async () => {
      await apiClientClient.patch(`/orders/${order.id}/admin-update`, {
        reasonValue,
        delayValue,
        tags,
        isExchange,
      });
    });
  }, [delayValue, order.id, reasonValue, registerSaveAction, tags, isExchange]);
```
(d) UI checkbox — thêm trong phần render của component (gần khối reason/delay), ví dụ ngay sau vùng tags:
```tsx
      <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isExchange}
          onChange={(e) => { setIsExchange(e.target.checked); setHasChanges(true); }}
          className="w-4 h-4 accent-amber-500"
        />
        <span className="text-sm text-gray-700">Đơn đổi (chặn kích hoạt voucher + ghép ghi chú)</span>
      </label>
```

- [ ] **Step 6: Đảm bảo `page.tsx` truyền `isExchange`**

Trong `frontend/src/app/admin/orders/[id]/page.tsx`, chỗ render `<OrderInfoClient order={...} .../>` (cột phải, ~629), `order` truyền vào đã là object từ `GET /orders/:id` (chứa `isExchange` sau migration). Không cần đổi nếu đang spread cả order; nếu đang truyền field lẻ, bổ sung `isExchange: order.isExchange` vào object prop.

- [ ] **Step 7: Kiểm chứng thủ công**

BE+FE local. URL `/admin/orders/<id>`:
1. Form voucher: chọn "Thủ công", tạo → card hiện "Trạng thái ví khách: 🕒 Chờ kích hoạt".
2. Đổi trạng thái đơn sang "Đã nhận" + tổng ≥ 100k → reload → card hiện "⏳ Chờ duyệt" + nút "Duyệt".
3. Bấm "Duyệt" → "✅ Đã kích hoạt".
4. Bật "Đơn đổi" → Lưu thay đổi → note đơn có `[ĐƠN ĐỔI]`; voucher (nếu còn PENDING) chuyển "❌ Từ chối" sau khi trạng thái đơn cập nhật.
Expected: đúng như trên.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/admin/CreateOrderVoucherButton.tsx frontend/src/components/admin/OrderInfoClient.tsx frontend/src/app/admin/orders/[id]/page.tsx
git commit -m "feat(admin): order-voucher approvalMode + status/approve UI + Đơn đổi checkbox"
```

---

## Task 9: FE Khách — trạng thái voucher thưởng ở chi tiết đơn

**Files:**
- Modify: `frontend/src/app/portal/orders/[id]/OrderDetailClient.tsx`

**Interfaces:**
- Consumes: `GET /vouchers/order-voucher-status/:orderCode` (Task 7).

- [ ] **Step 1: Fetch trạng thái voucher của đơn**

Trong `OrderDetailClient.tsx` (client component), thêm state + effect (dùng `apiClientClient` như các component khác):
```ts
  const [rewardVoucher, setRewardVoucher] = useState<{
    exists: boolean; status: string | null;
    voucher: { code: string; name: string; type: string; value: number; maxDiscount: number | null } | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiClientClient
      .get(`/vouchers/order-voucher-status/${order.orderCode}`)
      .then((res: any) => { if (!cancelled) setRewardVoucher(res); })
      .catch(() => { if (!cancelled) setRewardVoucher(null); });
    return () => { cancelled = true; };
  }, [order.orderCode]);
```
(Nếu file chưa import `useState/useEffect`/`apiClientClient`, thêm import tương ứng ở đầu file.)

- [ ] **Step 2: Render block trạng thái**

Trong khối "Chi tiết thanh toán" (sau block voucher discount ~443) thêm:
```tsx
      {rewardVoucher?.exists && rewardVoucher.voucher && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <div className="font-semibold text-amber-800">🎁 Voucher thưởng của đơn</div>
          <div className="mt-1 font-mono text-gray-800">{rewardVoucher.voucher.code}</div>
          <div className="text-gray-600">
            {rewardVoucher.voucher.type === 'PERCENT'
              ? `Giảm ${rewardVoucher.voucher.value}%`
              : rewardVoucher.voucher.type === 'FREESHIP'
                ? 'Miễn phí vận chuyển'
                : `Giảm ${fmt(rewardVoucher.voucher.value)}`}
          </div>
          <div className="mt-1 font-medium">
            {rewardVoucher.status === 'PENDING' && '🕒 Chờ kích hoạt — kích hoạt khi nhận hàng thành công'}
            {rewardVoucher.status === 'WAITING_APPROVAL' && '⏳ Chờ cửa hàng duyệt'}
            {rewardVoucher.status === 'ACTIVE' && '✅ Đã kích hoạt — dùng được'}
            {rewardVoucher.status === 'REJECTED' && '❌ Không đủ điều kiện kích hoạt'}
          </div>
        </div>
      )}
```
(`fmt` là hàm format tiền đã dùng trong file.)

- [ ] **Step 3: Kiểm chứng thủ công**

Đăng nhập khách sở hữu đơn, mở `/portal/orders/<id>`: hiện block "🎁 Voucher thưởng" + đúng trạng thái. Đơn của khách khác → không hiện.
Expected: đúng.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/portal/orders/[id]/OrderDetailClient.tsx
git commit -m "feat(portal): show reward-voucher status on order detail"
```

---

## Task 10: FE Admin Khách hàng — status/sourceOrderCode/unlockAt + fix bug PERCENT

**Files:**
- Modify: `backend-nestjs/src/admin/admin.service.ts` (select userVouchers 432–442)
- Modify: `frontend/src/app/admin/customers/[id]/page.tsx` (interface 29–40, card 351–375, bug dòng 360)

**Interfaces:**
- Consumes: admin customer detail nay trả `userVouchers[].status/sourceOrderCode/unlockAt`.

- [ ] **Step 1: BE — select thêm 3 field**

Trong `admin.service.ts`, block select `userVouchers` (432–442) thay bằng:
```ts
        userVouchers: {
          select: {
            id: true,
            isUsed: true,
            usedAt: true,
            createdAt: true,
            status: true,
            sourceOrderCode: true,
            unlockAt: true,
            voucher: { select: { code: true, type: true, value: true, validTo: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
```

- [ ] **Step 2: FE — mở rộng interface + fix bug**

Trong `admin/customers/[id]/page.tsx`:

(a) `interface CustomerVoucher` (29–40): thêm
```ts
  status?: string | null;
  sourceOrderCode?: string | null;
  unlockAt?: string | Date | null;
```
(b) **FIX BUG dòng 360:** `item.voucher?.type === 'PERCENTAGE'` → `item.voucher?.type === 'PERCENT'`.

- [ ] **Step 3: FE — hiển thị trạng thái mới trong card**

Thay badge "Đã dùng/Chưa dùng" (khối `<span ... style={item.isUsed ? ...}>`) để phản ánh `status`. Thêm map + render:
```tsx
        {(() => {
          const STATUS: Record<string, { label: string; bg: string; color: string }> = {
            PENDING: { label: '🕒 Chờ kích hoạt', bg: '#fef3c7', color: '#b45309' },
            WAITING_APPROVAL: { label: '⏳ Chờ duyệt', bg: '#fef3c7', color: '#b45309' },
            ACTIVE: { label: 'Chưa dùng', bg: '#d1fae5', color: '#047857' },
            REJECTED: { label: '❌ Từ chối', bg: '#fee2e2', color: '#b91c1c' },
          };
          if (item.isUsed) return { label: 'Đã dùng', bg: '#f3f4f6', color: '#6b7280' };
          return STATUS[item.status || 'ACTIVE'] || STATUS.ACTIVE;
        })()}
```
Áp dụng: đổi `<span ... style={item.isUsed ? {...} : {...}}>{item.isUsed ? 'Đã dùng' : 'Chưa dùng'}</span>` thành dùng object trên (gán vào biến `st` rồi `style={{ background: st.bg, color: st.color }}` + `{st.label}`).

Và dưới dòng type/value, thêm `sourceOrderCode`:
```tsx
            {item.sourceOrderCode ? <div className="text-[11px] text-[#9ca3af]">Từ đơn #{item.sourceOrderCode}</div> : null}
```

- [ ] **Step 4: Kiểm chứng thủ công**

`/admin/customers/<id>`: voucher % hiển thị "Giảm 10%" (không phải "10 ₫"); voucher order hiện badge trạng thái + "Từ đơn #...".
Expected: đúng.

- [ ] **Step 5: Commit**

```bash
git add backend-nestjs/src/admin/admin.service.ts "frontend/src/app/admin/customers/[id]/page.tsx"
git commit -m "fix(admin): PERCENT voucher label + show voucher status/sourceOrderCode"
```

---

## Task 11: FE Ví khách — nhãn WAITING_APPROVAL

**Files:**
- Modify: `frontend/src/app/portal/vouchers/page.tsx`

- [ ] **Step 1: Gộp WAITING_APPROVAL vào nhóm pending**

Trong `page.tsx`, chỗ tính `pendingVouchers` (63–67, điều kiện `status==='PENDING'`), mở rộng:
```ts
  const pendingVouchers = myVouchers.filter(
    (v: any) => !v.isUsed && (v.status === 'PENDING' || v.status === 'WAITING_APPROVAL'),
  );
```
Và trong `available` (69–75) đảm bảo loại cả `WAITING_APPROVAL` và `REJECTED` (thêm `&& v.status !== 'WAITING_APPROVAL' && v.status !== 'REJECTED'`).

- [ ] **Step 2: Nhãn riêng cho WAITING_APPROVAL trong `renderPendingVoucherCard`**

Trong `renderPendingVoucherCard` (140–197), thay dòng badge/nhãn để phân biệt:
```tsx
        {v.status === 'WAITING_APPROVAL'
          ? '⏳ Chờ cửa hàng duyệt'
          : daysUntil === 0
            ? 'Đang chờ hệ thống kích hoạt...'
            : 'Kích hoạt khi nhận hàng thành công'}
```
(Với order-voucher `unlockAt` null nên dùng thông điệp cố định thay vì "Khả dụng sau N ngày".)

- [ ] **Step 3: Kiểm chứng thủ công**

Khách có voucher `WAITING_APPROVAL` mở `/portal/vouchers`: card nằm ở mục "Đang chờ", nhãn "⏳ Chờ cửa hàng duyệt". Voucher `PENDING`: "Kích hoạt khi nhận hàng thành công".
Expected: đúng.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/portal/vouchers/page.tsx
git commit -m "feat(portal): wallet label for WAITING_APPROVAL order-voucher"
```

---

## Task 12: FE Trang QR xem trạng thái (bảo vệ bằng đăng nhập)

**Files:**
- Create: `frontend/src/app/portal/voucher-status/page.tsx`

**Interfaces:**
- Consumes: `GET /vouchers/order-voucher-status/:orderCode` qua `apiClient` (server-side, kèm cookie). Bảo vệ bởi `portal/layout.tsx` (chưa đăng nhập → redirect `/login?returnTo=...`).

- [ ] **Step 1: Tạo trang RSC**

Tạo `frontend/src/app/portal/voucher-status/page.tsx`:
```tsx
import { apiClient } from '@/lib/apiClient';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function fmt(n: number) {
  return (n || 0).toLocaleString('vi-VN') + ' đ';
}

export default async function VoucherStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ orderCode?: string }>;
}) {
  const session = await getSession();
  if (!session) return null; // layout đã redirect sang /login

  const { orderCode } = await searchParams;
  if (!orderCode) {
    return <div className="p-6 text-center text-gray-600">Thiếu mã đơn hàng.</div>;
  }

  let data: any = null;
  try {
    data = await apiClient.get(`/vouchers/order-voucher-status/${orderCode}`, { cache: 'no-store' });
  } catch {
    data = null;
  }

  if (!data?.exists || !data.voucher) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <div className="text-lg font-semibold text-gray-800">Không tìm thấy voucher</div>
        <p className="mt-2 text-sm text-gray-500">Đơn #{orderCode} chưa có voucher, hoặc không thuộc tài khoản của bạn.</p>
      </div>
    );
  }

  const STATUS: Record<string, string> = {
    PENDING: '🕒 Chờ kích hoạt',
    WAITING_APPROVAL: '⏳ Chờ cửa hàng duyệt',
    ACTIVE: '✅ Đã kích hoạt — dùng được',
    REJECTED: '❌ Không đủ điều kiện kích hoạt',
  };

  return (
    <div className="mx-auto max-w-md p-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="text-lg font-bold text-amber-900">🎁 Voucher đơn #{orderCode}</div>
        <div className="mt-2 font-mono text-gray-800">{data.voucher.code}</div>
        <div className="text-gray-700">
          {data.voucher.type === 'PERCENT'
            ? `Giảm ${data.voucher.value}%`
            : data.voucher.type === 'FREESHIP'
              ? 'Miễn phí vận chuyển'
              : `Giảm ${fmt(data.voucher.value)}`}
        </div>
        <div className="mt-3 text-base font-semibold text-gray-900">{STATUS[data.status] || data.status}</div>
        <p className="mt-3 rounded-lg bg-white/70 p-3 text-sm text-gray-600">
          Voucher chỉ được kích hoạt khi khách nhận hàng thành công.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: (Tuỳ chọn) Cập nhật URL QR trỏ trang mới**

Nếu muốn QR trỏ trang trạng thái thay vì `qr_claim`, sửa `ExportQRButton.tsx:52` và `qr-config/page.tsx:81` từ `/portal?campaign=qr_claim&orderCode=${...}` thành `/portal/voucher-status?orderCode=${...}`. (Giữ nguyên nếu chưa muốn đổi QR đã in — trang mới vẫn truy cập trực tiếp được.)

- [ ] **Step 3: Kiểm chứng thủ công**

- Chưa đăng nhập, mở `/portal/voucher-status?orderCode=ORD1` → bị redirect `/login?returnTo=...`.
- Đăng nhập chủ đơn → thấy card + trạng thái + thông báo "chỉ kích hoạt khi nhận hàng thành công".
- Đăng nhập user khác → "Không tìm thấy voucher".
Expected: đúng.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/portal/voucher-status/page.tsx frontend/src/components/admin/ExportQRButton.tsx frontend/src/app/admin/qr-config/page.tsx
git commit -m "feat(portal): QR voucher-status page protected by login"
```

---

## Task 13: BE Định danh khách theo SĐT + OTP (đăng nhập lần đầu — yêu cầu A)

**Files:**
- Modify: `backend-nestjs/src/vouchers/vouchers.service.ts` (thêm `sendLoginOtp`, `verifyLoginOtp`)
- Modify: `backend-nestjs/src/auth/auth.service.ts` (thêm `loginWithPhoneOtp`)
- Modify: `backend-nestjs/src/auth/auth.controller.ts` (route `send-login-otp`, `otp-login`)
- Test: `backend-nestjs/src/vouchers/order-voucher-activation.spec.ts` (bổ sung cho verifyLoginOtp)

**Interfaces:**
- Produces:
  - `VouchersService.sendLoginOtp(phone: string): Promise<{ success: boolean }>` — tạo `OtpRecord` (6 số, TTL 5’) theo SĐT, gửi SMS. KHÔNG cần orderCode.
  - `VouchersService.verifyLoginOtp(phone: string, otp: string): Promise<boolean>` — tìm OtpRecord hợp lệ, đánh dấu `isUsed`, throw nếu sai/hết hạn.
  - `AuthService.loginWithPhoneOtp(phone, otp): Promise<{ success: true; user; accessToken; refreshToken; redirect: string }>` — verify OTP → find-or-create User CUSTOMER theo phone → link guest orders theo `shippingPhone` → phát token.
  - Route `POST /auth/send-login-otp` (Public), `POST /auth/otp-login` (Public, set cookie như `login`).

- [ ] **Step 1: Test fail — verifyLoginOtp**

Bổ sung vào `order-voucher-activation.spec.ts`:
```ts
describe('verifyLoginOtp', () => {
  it('marks OTP used and returns true when valid', async () => {
    const prisma: any = {
      otpRecord: {
        findFirst: jest.fn(async () => ({ id: 'r1', phone: '0900000000', otpCode: '123456' })),
        update: jest.fn(async () => ({})),
      },
    };
    const svc = new VouchersService(prisma, {} as any, {} as any, { handleVoucherCreated: jest.fn() } as any);
    await expect(svc.verifyLoginOtp('0900000000', '123456')).resolves.toBe(true);
    expect(prisma.otpRecord.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'r1' }, data: { isUsed: true } }));
  });

  it('throws when OTP invalid', async () => {
    const prisma: any = { otpRecord: { findFirst: jest.fn(async () => null) } };
    const svc = new VouchersService(prisma, {} as any, {} as any, { handleVoucherCreated: jest.fn() } as any);
    await expect(svc.verifyLoginOtp('0900000000', '000000')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Chạy test — FAIL**

Run: `cd backend-nestjs && yarn test src/vouchers/order-voucher-activation.spec.ts -t "verifyLoginOtp"`
Expected: FAIL.

- [ ] **Step 3: Viết `sendLoginOtp` + `verifyLoginOtp`**

Thêm vào `VouchersService` (gần `sendOtp` ~168):
```ts
  private normalizePhoneForOtp(phone: string): string {
    return (phone || '').replace(/[\s-]/g, '');
  }

  async sendLoginOtp(phone: string) {
    const normalizedPhone = this.normalizePhoneForOtp(phone);
    if (normalizedPhone.length < 9) {
      throw new BadRequestException('Số điện thoại không hợp lệ');
    }
    const recent = await this.prisma.otpRecord.findFirst({
      where: { phone: normalizedPhone, isUsed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent && Date.now() - new Date(recent.createdAt).getTime() < 60 * 1000) {
      throw new BadRequestException('Vui lòng đợi 60 giây trước khi gửi lại OTP');
    }
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await this.prisma.otpRecord.create({
      data: { phone: normalizedPhone, otpCode, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
    });
    const isSent = await this.smsService.sendOtpSms(normalizedPhone, otpCode);
    if (!isSent) throw new BadRequestException('Không thể gửi SMS lúc này. Vui lòng thử lại sau.');
    return { success: true };
  }

  async verifyLoginOtp(phone: string, otp: string): Promise<boolean> {
    const normalizedPhone = this.normalizePhoneForOtp(phone);
    const record = await this.prisma.otpRecord.findFirst({
      where: { phone: normalizedPhone, otpCode: otp, isUsed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) throw new BadRequestException('Mã OTP không đúng hoặc đã hết hạn');
    await this.prisma.otpRecord.update({ where: { id: record.id }, data: { isUsed: true } });
    return true;
  }
```

- [ ] **Step 4: Chạy test — PASS**

Run: `cd backend-nestjs && yarn test src/vouchers/order-voucher-activation.spec.ts -t "verifyLoginOtp"`
Expected: PASS.

- [ ] **Step 5: `AuthService.loginWithPhoneOtp`**

Thêm vào `AuthService` (dùng `this.vouchersService`, `this.generateTokens`, `this.storeRefreshToken` sẵn có):
```ts
  async loginWithPhoneOtp(phone: string, otp: string) {
    const normalizedPhone = (phone || '').replace(/[\s-]/g, '');
    await this.vouchersService.verifyLoginOtp(normalizedPhone, otp);

    let user = await this.prisma.user.findFirst({ where: { phone: normalizedPhone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: normalizedPhone,
          name: normalizedPhone,
          role: 'CUSTOMER',
          isActive: true,
        },
      });
    }
    if (!user.isActive) throw new UnauthorizedException('Tài khoản đã bị khoá');

    // Nối đơn khách vãng lai theo SĐT (tái dùng pattern register).
    await this.prisma.order.updateMany({
      where: { userId: null, shippingPhone: normalizedPhone },
      data: { userId: user.id },
    });

    const tokens = await this.generateTokens(user.id, user.role);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      success: true,
      user,
      ...tokens,
      redirect: '/portal/products',
    };
  }
```
(Import `UnauthorizedException` nếu chưa có.)

- [ ] **Step 6: Controller routes**

Trong `auth.controller.ts` thêm (import `Public` nếu chưa có):
```ts
  @Post('send-login-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi OTP đăng nhập theo SĐT' })
  async sendLoginOtp(@Body() body: { phone: string }) {
    return this.authService.vouchersServiceSendLoginOtp
      ? this.authService.vouchersServiceSendLoginOtp(body.phone)
      : this.authService.sendLoginOtpProxy(body.phone);
  }

  @Post('otp-login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập bằng SĐT + OTP' })
  async otpLogin(
    @Body() body: { phone: string; otp: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.loginWithPhoneOtp(body.phone, body.otp);
    response.cookie('crm_access_token', result.accessToken, {
      httpOnly: true, secure: true, sameSite: 'none', domain: process.env.COOKIE_DOMAIN, maxAge: 15 * 60 * 1000,
    });
    response.cookie('crm_refresh_token', result.refreshToken, {
      httpOnly: true, secure: true, sameSite: 'none', domain: process.env.COOKIE_DOMAIN, maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { success: result.success, redirect: result.redirect, user: result.user };
  }
```
Để `send-login-otp` gọi được `VouchersService`, thêm phương thức mỏng vào `AuthService`:
```ts
  async sendLoginOtpProxy(phone: string) {
    return this.vouchersService.sendLoginOtp(phone);
  }
```
Và đơn giản hoá controller `sendLoginOtp` thành: `return this.authService.sendLoginOtpProxy(body.phone);` (bỏ nhánh điều kiện — dùng đúng một dòng này).

- [ ] **Step 7: Build check**

Run: `cd backend-nestjs && npx tsc --noEmit -p tsconfig.json`
Expected: không lỗi type ở auth/vouchers.

- [ ] **Step 8: Kiểm chứng thủ công**

`curl -X POST localhost:<port>/auth/send-login-otp -d '{"phone":"09..."}' -H 'Content-Type: application/json'` → `{ success: true }`, SMS gửi (hoặc log OTP nếu SMS sandbox). Sau đó `POST /auth/otp-login` với OTP đúng → nhận cookie + `{ success, redirect, user }`; user CUSTOMER được tạo/nối đơn theo SĐT.
Expected: đúng.

- [ ] **Step 9: Commit**

```bash
git add backend-nestjs/src/vouchers/vouchers.service.ts backend-nestjs/src/auth/auth.service.ts backend-nestjs/src/auth/auth.controller.ts backend-nestjs/src/vouchers/order-voucher-activation.spec.ts
git commit -m "feat(auth): phone + OTP passwordless identification/login for wallet access"
```

---

## Self-Review

**Spec coverage:**
- R1 (không auto-sinh, form inline): Task 8 (form đã inline sẵn, thêm approvalMode). ✔
- R2 / C (kích hoạt khi giao thành công + cột Auto/Manual trên voucher): Task 1 (`approvalMode`), Task 2 (engine), Task 3 (hook), Task 5 (duyệt), Task 8 (UI). ✔
- R3 / E2 (hủy/hoàn/đổi/giao thất bại + ô Đơn đổi → không kích hoạt): Task 2 (REJECT_STATUSES + isExchange), Task 6 (isExchange lưu + note + VTP). ✔
- R4 (1 voucher + 1 QR/đơn): giữ unique `code`/`sourceOrderCode` — Task 4. ✔
- R5 / D (voucher CHỜ vào ví ngay; QR = link xem trạng thái): Task 4 (tạo PENDING), Task 7 + Task 12 (trang trạng thái + endpoint). ✔
- A (định danh SĐT + OTP lần đầu): Task 13. ✔
- E (giao thành công VÀ COD ≥ 100k, ngưỡng cấu hình): Task 2 (`getCodActivationThreshold`, so `totalAmount`). ✔
- Data model mục 4: Task 1 (đủ `approvalMode`, `approvedAt/ById`, `isExchange`, enum; `order_voucher_config` đọc động, không cần seed). ✔
- FE 6.1–6.5: Task 8/9/10/11/12. ✔
- Bug PERCENT: Task 10 Step 2. ✔
- Test máy trạng thái/ngưỡng/đổi/manual: Task 2, 4, 5, 6, 13. ✔

**Placeholder scan:** Không có TBD/TODO; mọi step có code thật, lệnh test thật (`yarn test src/...`), kỳ vọng rõ.

**Type consistency:** `syncOrderVoucherActivation`, `getCodActivationThreshold`, `approveOrderVoucher`, `getOrderVoucherStatus`, `sendLoginOtp`, `verifyLoginOtp`, `loginWithPhoneOtp` nhất quán tên + tham số giữa service/controller/test. Tập status `PENDING|WAITING_APPROVAL|ACTIVE|REJECTED` dùng đồng nhất. `approvalMode: 'AUTO'|'MANUAL'` khớp enum `ApprovalMode`. `OrderVoucherLookupResponse.userVoucher` (Task 4 BE) khớp FE (Task 8).

---

## Execution Handoff

Plan hoàn tất. Hai lựa chọn thực thi:

1. **Subagent-Driven (khuyến nghị)** — REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Mỗi task một subagent mới + review hai tầng giữa các task.
2. **Inline Execution** — REQUIRED SUB-SKILL: superpowers:executing-plans. Chạy theo lô với checkpoint để review.

Chọn cách nào?