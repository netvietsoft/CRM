# 🗃️ HỢP ĐỒNG & QUY ƯỚC DATABASE SCHEMA (docs/Contracts/database-schema.md)

---

## 1. Quy ước Khóa Ngoại & Ràng buộc Xóa (OnDelete Actions)

| Quan hệ Cha -> Con | Hành vi khi Xóa (onDelete) | Lý do nghiệp vụ |
|---|---|---|
| `User -> Order` | `SetNull` | Giữ nguyên lịch sử đơn hàng và doanh thu khi user bị xóa |
| `Store -> Order` | `Cascade` / `Restrict` | Đơn hàng phải luôn thuộc về 1 Store xác định |
| `Order -> OrderItem` | `Cascade` | Xóa đơn hàng thì xóa các dòng chi tiết sản phẩm |
| `Product -> ProductVariant` | `Cascade` | Xóa sản phẩm gốc thì xóa các biến thể tương ứng |
| `Product -> OrderItem` | `SetNull` | Giữ nguyên lịch sử mua hàng ngay cả khi sản phẩm bị xóa khỏi catalog |
| `User -> ReferralClosure` | `Cascade` | Xóa nút trong cây giới thiệu khi user bị xóa |
| `User -> CommissionLedger` | `SetNull` / `Cascade` | Bảo toàn dữ liệu đối soát tài chính |

---

## 2. Tiêu chuẩn Kiểu Dữ liệu Tiền tệ & Số liệu
- **Tiền tệ (VND)**: Sử dụng số nguyên đồng (`Int` hoặc `BigInt`), đối với các phép tính chiết khấu lũy kế cần chuyển sang `Decimal(15, 2)` để tránh sai số IEEE 754 của kiểu `Float`.
- **Định danh ID**: Toàn bộ ID bảng chính sử dụng chuỗi UUID (`@id @default(uuid())`).
- **Thời gian**: Lưu trữ UTC ISO 8601, khi hiển thị trên giao diện quy đổi về múi giờ Việt Nam (`Asia/Ho_Chi_Minh`, UTC+7).

