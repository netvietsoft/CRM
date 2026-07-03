# materials — Master data: chất liệu (cotton/poly) cho sản phẩm
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/.

## File chính
- `materials.controller.ts` — định tuyến `/api/materials` (đọc Public; ghi ADMIN/STAFF).
- `materials.service.ts` — CRUD đơn giản.
- `dto/create-material.dto.ts`, `dto/update-material.dto.ts`.
- `materials.module.ts` — wiring.

## Luồng / logic quan trọng (gotcha)
- Model `Material(name, code, isActive)` → tham chiếu bởi `Product.materialId`.
- Dữ liệu tham chiếu phẳng; lọc được trong products admin.
- Xoá material đang được Product dùng có thể vỡ ràng buộc → kiểm trước khi xoá.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- Hiện chưa phát hiện vấn đề trong audit gần nhất.

## Quy ước khi sửa
- Đọc Public phải `@Public()`; ghi gắn guard + `@Roles('ADMIN','STAFF',...)`.
- KHÔNG xoá cứng material còn được `Product` tham chiếu (cân nhắc `isActive=false`).
- Field mới phải khai báo trong DTO (ValidationPipe `forbidNonWhitelisted`).
