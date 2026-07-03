# products — Catalog: biến thể (size×color), combo, tag, lọc
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/.

## File chính
- `products.controller.ts` — định tuyến `/api/products` (đa số Public đọc; ghi cần PRODUCTS_MANAGE; xoá ADMIN/MOD).
- `products.service.ts` — nghiệp vụ: create/update/remove (bọc `$transaction`), lọc, biến thể, combo, tag, stats tồn kho.
- `dto/create-product.dto.ts`, `dto/update-product.dto.ts`, `dto/filter-product.dto.ts`.
- `products.module.ts` — wiring.

## Luồng / logic quan trọng (gotcha)
- **Tồn kho 2 cấp**: `Product.stockQuantity` (gốc) + `ProductVariant.stock`. Đơn trừ/hoàn theo cả hai (logic ở module orders).
- **Biến thể**: mỗi `ProductVariant` (size×color) có `price`/`stock` riêng; khi có size/color, đơn dùng `variant.price`.
- **Combo** (`isComboSet`): chứa SP con + số lượng qua `ProductComboItem`; KHÔNG tự tham chiếu (đã chống combo trỏ chính nó).
- **Tag** many-to-many qua `ProductTagMap`.
- **Lọc**: theo category/supplier/material/unit/tag/giá/store. Non-admin PHẢI dùng `effectiveStoreId`; `storeId` có thể null (catalog chung).
- create/update/remove đã bọc `$transaction` + validate quan hệ — **đây là điểm tốt, giữ nguyên kiểu**.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- 🟡 `products.service.ts:693` — Xoá cứng SP gọi `deleteMany(orderItem)` → mất lịch sử dòng hàng của đơn cũ. **Sửa:** chặn xoá nếu SP đã có orderItem, hoặc chuyển soft-delete.
- 🟢 Một số input nên có DTO + class-validator chặt hơn (docs/07 B.1-B.2).

## Quy ước khi sửa
- Giữ create/update/remove trong `prisma.$transaction` + validate quan hệ (supplier/material/unit/category/variant) + chống combo tự tham chiếu.
- Endpoint admin: `@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)` + `@Roles(...)` + `@Permissions(PRODUCTS_VIEW/PRODUCTS_MANAGE)`; đọc Public phải `@Public()`; xoá cứng chỉ ADMIN/MOD.
- Non-admin: scope theo `@GetEffectiveStoreId()` (catalog chung khi storeId null).
- Field mới phải khai báo trong DTO (ValidationPipe `forbidNonWhitelisted`).
- KHÔNG xoá cứng dữ liệu còn ràng buộc orderItem — bảo toàn lịch sử đơn.
