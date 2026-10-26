# ⚠️ BẢNG MÃ LỖI CHUẨN HỆ THỐNG (docs/Contracts/error-codes.md)

---

## 1. Mã Lỗi HTTP Chuẩn

| Mã HTTP | Tên Lỗi | Trường hợp sử dụng |
|:---:|---|---|
| **`400`** | `Bad Request` | DTO không hợp lệ, thiếu trường bắt buộc, dữ liệu đầu vào sai định dạng |
| **`401`** | `Unauthorized` | Thiếu Access Token, token hết hạn, chữ ký JWT không hợp lệ |
| **`403`** | `Forbidden` | Không đủ quyền (Role/Permissions) hoặc truy cập trái phép Store khác (IDOR) |
| **`404`** | `Not Found` | Không tìm thấy đơn hàng, sản phẩm, khách hàng hoặc tài nguyên yêu cầu |
| **`409`** | `Conflict` | Trùng lặp Email, Số điện thoại, Mã đơn hàng hoặc Mã Voucher |
| **`500`** | `Internal Server Error` | Lỗi ngoại lệ hệ thống không xử lý được, sự cố kết nối Database |

---

## 2. Mã Lỗi Nghiệp vụ Ứng dụng (Business Error Codes)

```json
{
  "statusCode": 400,
  "errorCode": "VOUCHER_REJECTED_CONDITION_NOT_MET",
  "message": "Đơn hàng chưa đạt giá trị tối thiểu 100.000đ để áp dụng voucher này",
  "details": {
    "orderCode": "CHYSHOP101",
    "minOrderValue": 100000,
    "currentSubtotal": 85000
  }
}
```

- `AUTH_INVALID_CREDENTIALS`: Sai số điện thoại hoặc mật khẩu.
- `AUTH_TOKEN_EXPIRED`: Access token đã hết hạn (kích hoạt client gọi `/auth/refresh`).
- `ORDER_INSUFFICIENT_STOCK`: Tồn kho sản phẩm/biến thể không đủ để đáp ứng đơn hàng.
- `VOUCHER_ALREADY_USED`: Mã giảm giá đã được sử dụng trước đó.
- `STORE_ACCESS_DENIED`: Nhân viên không có quyền truy cập dữ liệu của cửa hàng khác.

