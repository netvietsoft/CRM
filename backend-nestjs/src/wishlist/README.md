# wishlist — Danh sách yêu thích theo user (toggle)
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/.

## File chính
- `wishlist.controller.ts` — định tuyến `/api/wishlist` (cần JWT).
- `wishlist.service.ts` — nghiệp vụ: lấy danh sách, toggle thêm/bỏ.
- `wishlist.module.ts` — wiring.

## Luồng / logic quan trọng (gotcha)
- `GET /wishlist` → trả `{ productIds: [] }`.
- `POST /wishlist` → toggle thêm/bỏ theo body `{ productId }` (đã có thì xoá, chưa có thì thêm).
- Model `Wishlist(userId, productId)`.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- Hiện chưa phát hiện vấn đề trong audit gần nhất.

## Quy ước khi sửa
- Endpoint cần `JwtAuthGuard`; chỉ thao tác trên wishlist của chính user (scope userId).
- Nếu thêm field/endpoint → khai báo DTO + class-validator; cập nhật docs/02.
