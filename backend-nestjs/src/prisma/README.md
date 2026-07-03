# prisma — PrismaClient (kết nối DB) + module dùng chung + seed
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: xem ../../../first_readme.txt + docs/.

## File chính
- `prisma.service.ts` — `PrismaService extends PrismaClient`, `$connect` ở `onModuleInit` / `$disconnect` ở `onModuleDestroy`. Inject vào hầu hết service trong dự án.
- `prisma.module.ts` — module export PrismaService (thường `@Global` / được import rộng).
- `seed.ts` — script seed dữ liệu mẫu (RankConfig, CommissionConfig, admin...). Chạy thủ công, KHÔNG tự chạy khi boot.

> Lưu ý: schema thật ở `backend-nestjs/prisma/schema.prisma` (ngoài thư mục này). Enum/model: xem docs/04.

## Luồng / logic quan trọng (gotcha)
- DB local là `customer_crm` (MySQL qua Laragon, root không mật khẩu) — đã import dump, có sẵn bảng `_prisma_migrations`.
- `PrismaService` là điểm truy cập DB DUY NHẤT; mọi transaction (`$transaction`) đi qua đây — nhiều luồng nhạy cảm (tạo đơn, hoa hồng, spin) PHẢI bọc transaction.
- Quan hệ referral dùng closure table `ReferralClosure` — tạo user có referrer phải cập nhật bảng này.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- Hiện chưa phát hiện vấn đề trực tiếp trong thư mục `prisma/` trong audit gần nhất.
- (Liên quan gián tiếp: nhiều service THIẾU `$transaction` khi ghi nhiều bảng — vd orders/commissions/customerCancelOrder. Khi sửa các module đó, dùng `prisma.$transaction` của service này. Mẫu chuẩn: cron VietQR `orders.service.ts:154-291`.)

## Quy ước khi sửa
- KHÔNG chạy `prisma migrate dev` bừa trên DB local (đã import dump) — đổi schema phải bàn trước, thường chỉ `prisma generate` (docs/07 B.9).
- KHÔNG đổi tên DB `customer_crm` (docs/07 A.4).
- Thao tác ghi ≥2 bảng liên quan → bọc `prisma.$transaction`; trừ kho/tài nguyên dùng `updateMany` có điều kiện (idempotent) thay vì `decrement` vô điều kiện (docs/07 B.5, mẫu cron VietQR).
- Tạo user có referrer → cập nhật `ReferralClosure` (docs/07 B.9).
- BullMQ/Redis có thể không có ở local → code phải có nhánh fallback, đừng giả định queue luôn sống (docs/07 B.7).
