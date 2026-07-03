# product-tags — Master data: nhãn sản phẩm (trending/sale/new)
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/.

## File chính
- `product-tags.controller.ts` — định tuyến `/api/product-tags` (đọc Public; ghi ADMIN/STAFF).
- `product-tags.service.ts` — CRUD đơn giản.
- `dto/create-product-tag.dto.ts`, `dto/update-product-tag.dto.ts`.
- `product-tags.module.ts` — wiring.

## Luồng / logic quan trọng (gotcha)
- Model `ProductTag(name, slug unique)` — nhãn phẳng (trending/sale/new...).
- Nối product↔tag many-to-many qua bảng `ProductTagMap` (KHÔNG sửa quan hệ này tuỳ tiện — products lọc theo tag dựa vào nó).
- `slug` unique, thường tự sinh từ name.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- Hiện chưa phát hiện vấn đề trong audit gần nhất.

## Quy ước khi sửa
- Đọc Public phải `@Public()`; ghi gắn guard + `@Roles('ADMIN','STAFF',...)`.
- `slug` unique — xử lý P2002 khi tạo trùng.
- Xoá tag → dọn `ProductTagMap` liên quan (tránh map mồ côi).
- Field mới phải khai báo trong DTO (ValidationPipe `forbidNonWhitelisted`).
