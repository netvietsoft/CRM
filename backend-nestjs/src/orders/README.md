# orders — Module phức tạp nhất: tạo đơn, vòng đời trạng thái, voucher, hoa hồng, VietQR
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/.
> ⚠️ ĐÂY LÀ MODULE NHIỀU LỖI 🔴 NHẤT (audit 2026-06-27). Đọc kỹ phần "Vấn đề đang mở" TRƯỚC khi đụng bất kỳ thứ gì liên quan tới tồn kho / tiền / trạng thái.

## File chính
- `orders.controller.ts` — định tuyến (prefix `/api/orders`), gắn guard + @Permissions, lấy `@GetEffectiveStoreId()`.
- `orders.service.ts` — toàn bộ nghiệp vụ (~2200 dòng): tạo đơn, đổi trạng thái, huỷ, VietQR cron, sync khách vãng lai.
- `orders.service.spec.ts` — test có sẵn → CHẠY `yarn test` cho phần đụng tới.
- `dto/create-order.dto.ts` — đơn KH. `dto/create-admin-order.dto.ts` — đơn admin (ghi đè giá, khách vãng lai).
- `dto/update-order-status.dto.ts` — đổi trạng thái. `dto/check-stock.dto.ts`, `dto/shipping-fee.dto.ts`.
- `orders.module.ts` — wiring (CommissionsService, VouchersService, messaging automation, queue...).

## Luồng / logic quan trọng (gotcha)
- **Tạo đơn** (`create`): giỏ không rỗng + SP active → mọi item PHẢI cùng `storeId` (hoặc null), trộn store thì throw → áp rank discount theo `totalSpent` → biến thể (size/color) dùng `variant.price`, trừ `variant.stock` + `stockQuantity` → voucher (tối đa 1/đơn) → điểm hoa hồng (đổi 1:1) → tổng = subtotal - discount + shippingFee (min 0) → VietQR hạn 30' (lưu expiresAt/transactionCode vào metadata) → đơn ở PENDING/UNPAID.
- **Hai cấp tồn kho**: `Product.stockQuantity` (gốc) + `ProductVariant.stock`. Trừ khi tạo đơn, hoàn khi huỷ — phải hoàn CẢ HAI cấp.
- **Vòng đời trạng thái**: hoa hồng tạo khi COMPLETED; totalSpent cộng theo mốc DELIVERED/COMPLETED (đang bất đối xứng — xem dưới). OrderStatus có 13 giá trị (docs/04), KHÔNG hardcode chuỗi.
- **Cron VietQR** (mỗi phút, `:154-291`): đơn VIETQR + UNPAID + quá hạn → CANCELLED + hoàn kho 2 cấp + nhả voucher. **Đây là MẪU CHUẨN** (có cờ chống chạy chồng + `$transaction` + `updateMany` có điều kiện idempotent). Khi sửa logic hoàn trả ở nơi khác, COPY cách làm của cron này.
- **Khách vãng lai (admin)**: không cần userId nếu có name+phone; tự tạo/khớp khách theo SĐT.
- **Voucher QR-ORDER**: kiểm trạng thái đơn nguồn (ACTIVE nếu giao ≥7 ngày, PENDING nếu chưa giao, LOCKED nếu huỷ/hoàn). Cap maxDiscount + cap 25% subtotal.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- 🔴 `orders.service.ts:697-1134` (`create`), trừ kho `:740-750` — Tạo đơn KHÔNG `$transaction` + trừ kho không atomic/không kiểm tồn. Lỗi giữa chừng → kho âm, mất điểm hoa hồng, voucher bị đốt cho đơn không tồn tại; 2 request đồng thời → **oversell** (dùng `decrement` vô điều kiện). Lặp lại ở `createAdminOrder:1287-1300`. **Sửa:** bọc toàn bộ trong `prisma.$transaction`; trừ kho bằng `updateMany({ where:{id, stock:{gte:qty}}, data:{decrement} })` + kiểm `count===0` để throw hết hàng.
- 🔴 `orders.service.ts:1778-1931` (`updateStatus`) — Tác dụng phụ (cộng/trừ totalSpent, tính/huỷ hoa hồng, hoàn/trừ kho, soldCount) chạy RỜI RẠC, KHÔNG transaction → lỗi giữa chừng để dữ liệu nửa vời. **Sửa:** gói các tác dụng phụ trong 1 `$transaction`.
- 🔴 `orders.service.ts:2138-2177` (`customerCancelOrder`) — KH tự huỷ chỉ hoàn `stockQuantity`; KHÔNG nhả voucher, KHÔNG hoàn `variant.stock`, KHÔNG hoàn điểm hoa hồng đã trừ, không transaction. **Sửa:** làm theo cron VietQR (`:154-291`).
- 🔴 `orders.service.ts:1886` (+ chỗ release voucher) — Dùng enum SAI `'RETURNED'` (KHÔNG tồn tại trong OrderStatus). Enum thật là `RETURNING`/`REFUNDED` → nhánh hoàn kho/nhả voucher/huỷ hoa hồng KHÔNG BAO GIỜ chạy khi đơn chuyển `RETURNING`. **Sửa nhanh, tác động lớn:** đổi `'RETURNED'` → `'RETURNING'`.
- 🟡 `orders.service.ts:757-763, 1303-1309` — KHÔNG lưu snapshot `productName/productImageUrl` vào OrderItem dù schema có field + docs yêu cầu (bước 9 luồng tạo đơn). **Sửa:** ghi snapshot khi tạo OrderItem.
- 🟡 `orders.service.ts:1760-1775` + controller — `getPaymentStatus` KHÔNG truyền `effectiveStoreId` → STAFF/MOD sai scope. **Sửa:** truyền + scope theo store.
- 🟡 `orders.service.ts:1933-1958` (`customerConfirmReceived`) — Cho phép `SHIPPED→COMPLETED` (docs ghi `DELIVERED→COMPLETED`) → cộng totalSpent/hoa hồng sớm. **Sửa:** chỉ cho `DELIVERED→COMPLETED`.
- 🟡 `orders.service.ts:1850-1910` — Bất đối xứng mốc cộng/huỷ hoa hồng (DELIVERED vs COMPLETED) + dính enum `'RETURNED'`. **Sửa:** thống nhất 1 mốc + sửa enum.
- 🟢 cart dùng `salePrice || originalPrice`, order dùng `??` → lệch khi giá KM = 0. Cân nhắc thống nhất.

## Quy ước khi sửa
- Mọi thao tác kho/tiền/trạng thái có nhiều bước → BẮT BUỘC `prisma.$transaction`; trừ kho bằng `updateMany` có điều kiện `gte` (idempotent, chống oversell) — KHÔNG `decrement` trần.
- Dùng ĐÚNG enum `OrderStatus` (13 giá trị, docs/04). KHÔNG hardcode chuỗi (`'RETURNED'` là lỗi kinh điển ở module này).
- Endpoint admin: `@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)` + `@Roles(...)` + `@Permissions(ORDERS_VIEW/ORDERS_MANAGE)`. Public phải `@Public()`.
- Non-admin: LUÔN lấy `@GetEffectiveStoreId()` và scope query theo store (kể cả `getPaymentStatus`). ADMIN nhận null = toàn hệ thống.
- Field mới phải khai báo trong DTO (ValidationPipe `forbidNonWhitelisted`).
- Mỗi nhánh hoàn trả (huỷ/hoàn/hết hạn) phải hoàn ĐỦ: kho 2 cấp + voucher + điểm hoa hồng. Đối chiếu cron VietQR làm mẫu.
- Sửa logic trạng thái → kiểm cron VietQR + automation messaging liên quan.
