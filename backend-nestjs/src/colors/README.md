# colors — Master data: màu sắc cho biến thể sản phẩm
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/.

## File chính
- `colors.controller.ts` — định tuyến `/api/colors` (đọc Public; ghi ADMIN/STAFF).
- `colors.service.ts` — CRUD đơn giản.
- `dto/create-color.dto.ts`.
- `colors.module.ts` — wiring.

## Luồng / logic quan trọng (gotcha)
- Model `Color(name unique, hexCode)` (docs/02 có thêm `code`) → tham chiếu bởi `ProductVariant.colorId`.
- Dữ liệu tham chiếu phẳng.
- Xoá color đang được variant dùng có thể vỡ ràng buộc → kiểm trước khi xoá.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- Hiện chưa phát hiện vấn đề trong audit gần nhất.

## Quy ước khi sửa
- Đọc Public phải `@Public()`; ghi gắn guard + `@Roles('ADMIN','STAFF',...)`.
- `name` unique — xử lý P2002 khi tạo trùng.
- KHÔNG xoá cứng color còn được `ProductVariant` tham chiếu.
- Field mới phải khai báo trong DTO (ValidationPipe `forbidNonWhitelisted`).
