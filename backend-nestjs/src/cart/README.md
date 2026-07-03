# cart — Giỏ hàng theo user (1 Cart/user, tự tạo khi cần)
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/.

## File chính
- `cart.controller.ts` — định tuyến `/api/cart` (đều cần JWT).
- `cart.service.ts` — nghiệp vụ: lấy giỏ + subtotal, thêm/upsert item, đổi số lượng, xoá item, xoá sạch.
- `dto/add-to-cart.dto.ts`, `dto/update-cart-item.dto.ts`.
- `cart.module.ts` — wiring.

## Luồng / logic quan trọng (gotcha)
- 1 `Cart` / user (unique), tự tạo khi cần.
- Thêm item = upsert theo `productId + size + color`.
- **KHÔNG check tồn kho ở giỏ** — kiểm tồn chỉ khi tạo đơn (module orders).
- Giá item = `variant.price` nếu có biến thể, không thì `salePrice || originalPrice`.
- `GET /cart` áp rank discount khi ĐỌC (theo totalSpent) nhưng KHÔNG lưu lại.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- 🟢 cart dùng `salePrice || originalPrice`, còn orders dùng `??` → lệch khi giá KM = 0 (`0` bị coi là falsy ở cart). Cân nhắc thống nhất toán tử để giá khuyến mãi = 0 vẫn áp đúng.
- Ngoài ra hiện chưa phát hiện vấn đề 🔴/🟡 trong audit gần nhất.

## Quy ước khi sửa
- Giữ nguyên tắc: KHÔNG kiểm tồn ở giỏ (việc đó của orders); KHÔNG lưu rank discount vào DB.
- Endpoint đều cần `JwtAuthGuard`; thao tác chỉ trên giỏ của chính user (scope theo userId).
- Field mới phải khai báo trong DTO (ValidationPipe `forbidNonWhitelisted`).
- Nếu đổi công thức giá, đồng bộ với `orders.service` để giỏ và đơn khớp nhau.
