# stores — Đa cửa hàng (1 user ≤ 1 store)
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/.

## File chính
- `stores.controller.ts` — định tuyến `/api/stores` (admin CRUD cần ADMIN; my-store/tạo/sửa cần JWT; trang public + reviews là Public).
- `stores.service.ts` — nghiệp vụ: list/CRUD store, duyệt (approve), bật/tắt status, store của user, trang công khai theo slug.
- `stores.module.ts` — wiring.
- (Chưa có thư mục `dto/`.)

## Luồng / logic quan trọng (gotcha)
- 3 cờ trạng thái: `isActive` (hiển thị), `isBanned` (cấm), `isApproved` (đã duyệt). Phân biệt rõ khi lọc.
- `ownerId` unique → 1 user tối đa 1 store.
- Đơn/SP/category đều thuộc `storeId` → store là gốc của multi-store scope.
- Store có thông tin ngân hàng (`bankName/bankAccountNo/bankOwnerName`) + `allowCOD` → dùng cho thanh toán/VietQR đơn của store.
- `slug` unique cho trang công khai `/stores/public/:slug`.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- Hiện chưa phát hiện vấn đề trong audit gần nhất.
- 🟢 (Gợi ý chung) thêm DTO + class-validator cho input tạo/sửa store thay vì nhận object thô.

## Quy ước khi sửa
- Endpoint admin (`/stores/admin/...`): `@UseGuards(...)` + `@Roles('ADMIN')`. my-store/tạo/sửa: `JwtAuthGuard` + kiểm chủ sở hữu (`ownerId`). Trang public + reviews: `@Public()`.
- KHÔNG để user sửa store của người khác (kiểm `ownerId`).
- Thông tin ngân hàng nhạy cảm — không lộ ở endpoint public không cần thiết.
- Field mới phải khai báo trong DTO (nếu thêm DTO); cập nhật docs/02 + docs/04 khi đổi model.
