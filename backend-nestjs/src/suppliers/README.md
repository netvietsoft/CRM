# suppliers — Master data: nhà cung cấp cho sản phẩm
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/.

## File chính
- `suppliers.controller.ts` — định tuyến `/api/suppliers` (đọc Public; ghi ADMIN/STAFF).
- `suppliers.service.ts` — CRUD đơn giản.
- `dto/create-supplier.dto.ts`, `dto/update-supplier.dto.ts`.
- `suppliers.module.ts` — wiring.

## Luồng / logic quan trọng (gotcha)
- Model `Supplier(name, code, phone, email, address, isActive)` → tham chiếu bởi `Product.supplierId`.
- Dữ liệu tham chiếu phẳng.
- Xoá supplier đang được Product dùng có thể vỡ ràng buộc → kiểm trước khi xoá.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- Hiện chưa phát hiện vấn đề trong audit gần nhất.

## Quy ước khi sửa
- Đọc Public phải `@Public()`; ghi gắn guard + `@Roles('ADMIN','STAFF',...)`.
- KHÔNG xoá cứng supplier còn được `Product` tham chiếu (cân nhắc `isActive=false`).
- Field mới phải khai báo trong DTO (ValidationPipe `forbidNonWhitelisted`).
