# commission-config — Cấu hình % hoa hồng theo level (upsert)
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/ (đặc biệt docs/02 mục COMMISSIONS).

## File chính
- `commission-config.controller.ts` — GET /commission-config (public), PUT /commission-config (ADMIN).
- `commission-config.service.ts` — upsert config theo `level`; đọc cho `commissions.service` dùng.
- `dto/update-commission-config.dto.ts` — DTO cập nhật (level + percentage).

## Luồng / logic quan trọng (gotcha)
- Mỗi `level` (1..N) có `percentage`; `commissions.service.calculateCommissions` đọc các config ACTIVE và map `level === depth` của ReferralClosure.
- Upsert theo level — đổi % sẽ ảnh hưởng hoa hồng tính cho đơn MỚI (không hồi tố đơn cũ đã ghi ledger).

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- Hiện chưa phát hiện vấn đề trong audit gần nhất. (Liên quan: lỗi tính hoa hồng nằm ở `commissions.service.ts` — xem README commissions.)

## Quy ước khi sửa
- GET public phải có `@Public()`; PUT phải gắn guard + @Roles('ADMIN').
- Đổi % → kiểm tra tác động lên `commissions.service` (mốc cộng/huỷ).
- Field mới PHẢI khai báo trong DTO (ValidationPipe `forbidNonWhitelisted`).
