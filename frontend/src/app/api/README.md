# app/api — Route Handler công khai (proxy backend + upload)
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../../first_readme.txt + docs/03.

## File / thành phần chính
- Upload ảnh: đã BỎ UploadThing (2026-07-07). Ảnh sản phẩm/logo (admin) + ảnh đánh giá (khách) đều upload lên **R2** qua backend: `POST /upload/media` (admin, `lib/uploadR2.ts#uploadToR2`) và `POST /upload/review-image` (mọi user đã đăng nhập, `lib/uploadR2.ts#uploadReviewImageToR2`). Không còn route handler `uploadthing/` ở FE.
- `admin/integrations/sync-products/route.ts`, `sync-categories/route.ts` — proxy POST sang backend Pancake (có check ADMIN).
- `admin/integrations/get-shop-id/route.ts` — đọc `PANCAKE_API_KEY` + trả thông tin shop.

## Quy ước (gotcha)
- Route Handler chạy SERVER → được đọc secret/env (PANCAKE_API_KEY…), nhưng PHẢI tự kiểm session/role (`getSession`) trước khi trả dữ liệu — đây là endpoint công khai, không qua proxy.ts gating dữ liệu.
- Khi forward sang backend: base URL phải có `/api` và PHẢI forward auth (cookie/Bearer); fallback base thiếu `/api` là bug.
- Không trả secret thô ra client. Đây là nơi DUY NHẤT phía FE được chạm secret (cùng Server Action/RSC).
- Phân biệt với `app/internal-api` (chỉ đọc JSON tĩnh, không secret) — secret/proxy backend để ở đây.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- 🔴 `app/api/admin/integrations/get-shop-id/route.ts:3-14` — đọc `PANCAKE_API_KEY` + trả dữ liệu shop cho BẤT KỲ ai (2 route sync khác có check ADMIN). Hướng sửa: thêm `getSession()` + chặn non-admin.
- 🟡 `app/api/admin/integrations/sync-products|sync-categories/route.ts` — fallback base thiếu `/api` + không forward auth khi gọi backend. Hướng sửa: base có `/api` + forward cookie/Bearer.
