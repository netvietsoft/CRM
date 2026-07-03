# rank-config — Bậc khách hàng theo chi tiêu (discount theo rank)
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/ (đặc biệt docs/02 mục RANK-CONFIG).

## File chính
- `rank-config.controller.ts` — GET /rank-config (public), PUT /rank-config (ADMIN).
- `rank-config.service.ts` — `resolveRank(totalSpent)` + `recalculateAllUserRanks()`.
- `dto/update-rank-config.dto.ts` — DTO cập nhật ngưỡng/discount.

## Luồng / logic quan trọng (gotcha)
- Bậc mặc định: MEMBER ≥0, SILVER ≥2tr, GOLD ≥5tr, DIAMOND ≥10tr, PLATINUM ≥20tr. Mỗi rank có `discountPercent`.
- `resolveRank(totalSpent)` quét GIẢM DẦN, khớp ngưỡng đầu tiên → đảm bảo config sắp đúng thứ tự.
- **Đổi ngưỡng → gọi `recalculateAllUserRanks()` (chạy trong `$transaction`)** để cập nhật lại rank toàn bộ user.
- Rank discount được áp lên giá item LÚC ĐỌC giỏ/tạo đơn (cart không lưu, order tính lại) — sửa ngưỡng ảnh hưởng giá đơn mới.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- Hiện chưa phát hiện vấn đề trong audit gần nhất.

## Quy ước khi sửa
- GET public phải có `@Public()`; PUT gắn guard + @Roles('ADMIN').
- Đổi ngưỡng PHẢI kéo theo recalculate trong transaction (đừng để rank user lệch totalSpent).
- Field mới PHẢI khai báo trong DTO.
