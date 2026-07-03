# mail — Gửi email qua SMTP (Nodemailer)
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/ (docs/05 mục 6).

## File chính
- `mail.service.ts` — Nodemailer/SMTP. Hiện dùng `sendModeratorCredentials()` (gửi thông tin đăng nhập cho store đã duyệt).
- `mail.module.ts` — đăng ký service.

## Luồng / logic quan trọng (gotcha)
- Config env: SMTP_HOST, SMTP_PORT(587), SMTP_USER, SMTP_PASS, SMTP_SECURE, MAIL_FROM.
- Không có endpoint public — service nội bộ, được module khác gọi.
- KHÔNG retry khi gửi thất bại.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- 🟢 `mail.service` — `rejectUnauthorized:false` cố định (bỏ qua verify cert TLS). Production nên bật verify cert.
- 🟢 Không retry khi gửi lỗi — cân nhắc retry/queue cho email quan trọng.

## Quy ước khi sửa
- Đọc config từ env (đừng hardcode SMTP).
- Không commit secret SMTP.
- Nếu thêm loại email mới → tách template, giữ service mỏng.
