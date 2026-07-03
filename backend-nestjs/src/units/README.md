# units — Master data: đơn vị tính (cái/kg/lít) cho sản phẩm
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/.

## File chính
- `units.controller.ts` — định tuyến `/api/units` (đọc Public; ghi ADMIN/STAFF). CRUD đủ (GET/:id, PATCH, DELETE).
- `units.service.ts` — CRUD đơn giản.
- `dto/create-unit.dto.ts`, `dto/update-unit.dto.ts`.
- `units.module.ts` — wiring.

## Luồng / logic quan trọng (gotcha)
- Model `Unit(name, code, isActive)` → tham chiếu bởi `Product.unitId`.
- Dữ liệu tham chiếu phẳng; lọc được trong products admin.
- Xoá unit đang được Product dùng có thể vỡ ràng buộc → kiểm trước khi xoá.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- Hiện chưa phát hiện vấn đề trong audit gần nhất.

## Quy ước khi sửa
- Đọc Public phải `@Public()`; ghi gắn guard + `@Roles('ADMIN','STAFF',...)`.
- KHÔNG xoá cứng unit còn được `Product` tham chiếu (cân nhắc `isActive=false`).
- Field mới phải khai báo trong DTO (ValidationPipe `forbidNonWhitelisted`).
