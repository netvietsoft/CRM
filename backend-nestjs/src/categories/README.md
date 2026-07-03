# categories — Phân cấp cha/con, scope theo store
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/.

## File chính
- `categories.controller.ts` — định tuyến `/api/categories` (đọc Public; ghi cần CATEGORIES_MANAGE).
- `categories.service.ts` — nghiệp vụ: findAll (active, lọc store/admin), create (slug tự sinh), update, remove (cascade con).
- `categories.module.ts` — wiring.
- (Module này CHƯA có thư mục `dto/` — xem vấn đề bên dưới.)

## Luồng / logic quan trọng (gotcha)
- Phân cấp cha/con qua `parentId`; sắp xếp theo `sortOrder` rồi `name`.
- `slug` unique, tự sinh nếu thiếu khi tạo.
- Xoá category cascade xuống con.
- Scope theo store; `findAll(admin, storeId)`.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- 🟡 `categories.controller.ts:42-68` + `categories.service.ts:122-125` — `POST`/`PATCH` nhận `@Body() data: any` và `update` đẩy thẳng vào prisma → BỎ QUA ValidationPipe, client có thể ghi đè field tuỳ ý (mass-assignment). **Sửa:** tạo `dto/create-category.dto.ts` + `dto/update-category.dto.ts` với class-validator, whitelist field hợp lệ.
- 🟢 Nên thêm DTO chuẩn cho toàn bộ input (docs/07 B.1-B.2).

## Quy ước khi sửa
- TẠO DTO + class-validator thay cho `any` — đây là sửa ưu tiên nếu đụng vào create/update.
- Chỉ map các field cho phép vào prisma; KHÔNG spread cả body.
- Endpoint admin: `@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)` + `@Roles('ADMIN','STAFF','MODERATOR')` + `@Permissions(CATEGORIES_MANAGE)`; đọc Public phải `@Public()`.
- Non-admin: scope theo `@GetEffectiveStoreId()`.
