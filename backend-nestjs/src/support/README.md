# support — Form liên hệ công khai → AdminNotification
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/ (docs/02 mục SUPPORT).

## File chính
- `support.controller.ts` — POST /support/contact (public).
- `support.service.ts` — tạo `AdminNotification` type=SUPPORT từ form liên hệ.
- `dto/create-contact-request.dto.ts` — DTO form liên hệ.

## Luồng / logic quan trọng (gotcha)
- Endpoint public, không auth → cần validate DTO chặt + cân nhắc rate-limit/anti-spam (form mở cho khách vãng lai).
- Tạo notification cho admin qua AdminNotification (có thể đẩy realtime qua admin-notifications gateway).

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- Hiện chưa phát hiện vấn đề trong audit gần nhất.

## Quy ước khi sửa
- POST public phải có `@Public()` + DTO + class-validator (ValidationPipe `forbidNonWhitelisted`).
- Field mới PHẢI khai báo trong DTO.
