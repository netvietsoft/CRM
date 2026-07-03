# types — kiểu TypeScript dùng chung (FE)
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/03.

## File / thành phần chính
- `commerce.ts` — StoreSummary, ProductSummary, ProductVariant, VoucherDefinition, VoucherStackTier, UserVoucher, UserRankConfig, UserProfile, CartItem, CreateOrderResponse, ShippingFeeResponse.
- `integrations.ts` — Integration, IntegrationMetadata, IntegrationSyncResponse.

## Quy ước (gotcha)
- Chỉ là type/interface (không runtime). Phải KHỚP với response backend (DTO NestJS) — code backend là sự thật; lệch type → bug ngầm.
- Thêm trang/tính năng mới → thêm type vào đây (xem docs/07 mục E).
- Tiền tệ: VND, số nguyên đồng — kiểu `number` là số nguyên, đừng dùng float.
- Enum trạng thái (OrderStatus 13 giá trị…) phải đúng chuỗi backend — đừng tự chế (audit từng dính `'RETURNED'` sai).

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- Hiện chưa phát hiện vấn đề trong audit gần nhất.
