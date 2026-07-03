# integrations — Tích hợp ngoài: Pancake POS (sync + webhook), SMS (NetViet)
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/ (docs/05 mục 1 & 4).

## File chính
- `integrations.controller.ts` — GET /integrations, POST /integrations (upsert config). Gắn JwtAuthGuard+RolesGuard+PermissionsGuard, @Permissions(INTEGRATIONS_MANAGE).
- `integrations.service.ts` — đọc/upsert config tích hợp theo store (bảng StoreIntegration).
- `pancake/pancake.controller.ts` — sync-orders, sync-categories, sync-products, sync-all-orders, backfill-order-customers, **POST /integrations/pancake/webhook** (Pancake GỌI VÀO), configure-webhook.
- `pancake/pancake.service.ts` — toàn bộ logic sync + xử lý webhook order/customer/inventory.
- `sms/sms.service.ts` — service nội bộ gửi SMS qua NetViet HTTP API (OTP + fallback ZNS + kênh SMS messaging).

## Luồng / logic quan trọng (gotcha)
- **Pancake config**: `shopId`, `apiKey` lưu bảng `StoreIntegration`. Header webhook: `x-pancake-signature` (CHƯA ép verify), `x-pancake-shop-id`.
- **Sync gotcha**: chuẩn hoá SĐT (0/84), dedup đơn theo ID, tự tạo khách (ưu tiên phone→email), map mã trạng thái số Pancake → OrderStatus, phát hiện giao 1 phần (COD vs tổng), tính lại rank/totalSpent sau sync.
- **SMS**: resolve config từ DB (`MessageProviderConfig`) trước, fallback env. Chuẩn hoá SĐT về 84; validate ≥9 số; log che user/pass.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- 🔴 `pancake/pancake.controller.ts:105-130` — webhook Pancake KHÔNG verify chữ ký (nhận `x-pancake-signature` nhưng không dùng). Ai biết URL đều giả được webhook. **Sửa:** HMAC payload bằng apiKey/secret theo shopId + `timingSafeEqual`.
- 🟡 `pancake/pancake.service.ts:1614-1628` — product/inventory webhook nuốt lỗi sync hoàn toàn (catch rỗng) → mất dữ liệu im lặng. **Sửa:** log + đánh dấu lỗi rõ ràng.
- 🟡 `integrations/sms/sms.service.ts:281-294` — `isSuccessResponse` coi cả `code 0` lẫn `1` là thành công → có thể đánh dấu SENT cho tin FAIL. **Sửa:** xác định đúng mã thành công của NetViet.
- 🟡 `integrations.controller.ts:39` — `upsert` nhận `@Body() data:any` → bỏ qua validation. **Sửa:** tạo DTO.

## Quy ước khi sửa
- **Webhook**: verify chữ ký + idempotency (dedup đơn theo ID) — đừng bỏ check trùng (docs/07 B.10).
- Config Pancake/SMS đọc từ DB trước (StoreIntegration / MessageProviderConfig), fallback env.
- Scope theo `effectiveStoreId` cho non-admin.
- Field mới PHẢI khai báo trong DTO.
