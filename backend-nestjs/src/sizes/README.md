# sizes — Master data: kích cỡ cho biến thể sản phẩm
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/.

## File chính
- `sizes.controller.ts` — định tuyến `/api/sizes` (đọc Public; ghi ADMIN/STAFF).
- `sizes.service.ts` — CRUD đơn giản.
- `dto/create-size.dto.ts`.
- `sizes.module.ts` — wiring.

## Luồng / logic quan trọng (gotcha)
- Model `Size(name unique, code)` → tham chiếu bởi `ProductVariant.sizeId`.
- Dữ liệu tham chiếu phẳng, không phân cấp.
- Xoá size đang được variant dùng có thể vỡ ràng buộc → kiểm trước khi xoá.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- Hiện chưa phát hiện vấn đề trong audit gần nhất.

## Quy ước khi sửa
- Đọc Public phải `@Public()`; ghi gắn guard + `@Roles('ADMIN','STAFF',...)`.
- `name` unique — xử lý P2002 khi tạo trùng.
- KHÔNG xoá cứng size còn được `ProductVariant` tham chiếu.
- Field mới phải khai báo trong DTO (ValidationPipe `forbidNonWhitelisted`).
