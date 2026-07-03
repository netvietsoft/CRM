# reviews — Đánh giá SP, chỉ sau khi đơn COMPLETED
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/.

## File chính
- `reviews.controller.ts` — định tuyến `/api/reviews` (GET public; POST cần JWT).
- `reviews.service.ts` — nghiệp vụ: list review SP (lọc/sort/phân trang), tạo 1 review, review cả đơn.
- `reviews.module.ts` — wiring.
- (Chưa có thư mục `dto/`.)

## Luồng / logic quan trọng (gotcha)
- `POST /reviews` — validate KH ĐÃ MUA SP (qua orderItem trong đơn COMPLETED) + chống trùng review.
- `POST /reviews/order` — review tất cả item trong 1 đơn; nếu có comment → +1 lượt quay (`spinTurn`).
- Bỏ qua item `isGift`. Tối đa 5 ảnh / review.
- `GET /reviews` trả danh sách + `avgRating` + phân bố sao.
- `Review` lưu `isVerifiedPurchase`, `size`, `color` (snapshot chuỗi).

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- Hiện chưa phát hiện vấn đề trong audit gần nhất.
- 🟢 (Gợi ý chung) cân nhắc thêm DTO + class-validator cho body tạo review.

## Quy ước khi sửa
- Giữ điều kiện: chỉ review SP đã mua trong đơn COMPLETED; chống trùng; bỏ qua isGift; cap 5 ảnh.
- GET phải `@Public()`; POST cần `JwtAuthGuard` và scope theo user.
- Khi đổi điều kiện "đã mua", đối chiếu `orders.service` (`check-purchase`) để nhất quán.
- Field mới phải khai báo trong DTO (nếu thêm DTO) — ValidationPipe `forbidNonWhitelisted`.
