# app/internal-api — endpoint nội bộ FE (dữ liệu tĩnh, KHÔNG gọi backend)
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../../first_readme.txt + docs/03.

## File / thành phần chính
- `address/route.ts` — tra tỉnh/phường/quận huyện từ JSON tĩnh trong `src/data/*.json` (`tinh_tp.json`, `xa_phuong.json`, `quan_huyen.json`). Đọc-only, cache RAM. Không gọi backend, không DB.

## Quy ước (gotcha)
- Đây là dữ liệu tĩnh thuần — KHÔNG gọi backend, KHÔNG chạm secret. Khác hẳn `app/api` (proxy backend + secret).
- Chạy server (Route Handler). Trả JSON cho client; không cần auth vì không có dữ liệu nhạy cảm.
- Cần proxy backend hoặc xử lý secret → đặt ở `app/api`, KHÔNG đặt ở đây.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- Hiện chưa phát hiện vấn đề trong audit gần nhất.
