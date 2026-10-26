# 🚚 ĐẶC TẢ API VIETTELPOST PARTNER V2 (docs/Contracts/viettelpost-api-spec.md)

> Sử dụng cho các API Outbound: Tạo đơn, sửa đơn, tra cứu, tính cước và nhận Webhook Inbound từ ViettelPost.

---

## 1. Hosts Kết Nối
- **Production Host**: `https://partner.viettelpost.vn/v2/`
- **Development Host**: `https://partnerdev.viettelpost.vn/v2/`
- Header bắt buộc cho mọi request: `Token: <accessToken>`, `Content-Type: application/json`.

---

## 2. Danh mục Endpoints Outbound Chính

| Chức năng | Endpoint | Phương thức | Mô tả |
|---|---|:---:|---|
| **Đăng nhập Partner** | `user/LoginVTP` | `POST` | Nhận `token` ngắn hạn |
| **Lấy Token Dài hạn** | `user/ownerconnect` | `POST` | Cấp token ủy quyền có thời hạn ~1 năm |
| **Tạo Đơn Hàng (Mã ID)** | `order/createOrder` | `POST` | Tạo vận đơn bằng `PROVINCE_ID`, `DISTRICT_ID`, `WARDS_ID` |
| **Tạo Đơn Bằng Text (NLP)** | `order/createOrderNlp` | `POST` | ViettelPost tự tách địa chỉ text |
| **Sửa Thông Tin Vận Đơn** | `order/edit` | `POST` | Sửa thông tin khi đơn có `ORDER_STATUS < 200` |
| **Cập Nhật Trạng Thái** | `order/UpdateOrder` | `POST` | Hủy đơn (`TYPE = 4`), đổi COD |
| **Tra Cứu Chi Tiết** | `order/detail-v2` | `GET` | Lấy chi tiết bưu gửi và enrich SĐT, địa chỉ người nhận |
| **Tính Cước Vận Chuyển** | `order/getPriceAllNlp` | `POST` | Tra cứu bảng giá cước |
| **Danh mục Địa danh mới** | `categories/listProvinceNew` (v3) | `GET` | Danh sách 34 Tỉnh/Thành phố mới |
| **Danh mục Xã/Phường mới** | `categories/listWardsNew?provinceId=` | `GET` | Danh sách Xã/Phường gắn trực tiếp vào Tỉnh |

---

## 3. Webhook Payload Inbound (`POST /api/viettelpost/webhook`)
Dữ liệu gửi trong `payload.DATA`:
- `ORDER_NUMBER`: Mã vận đơn ViettelPost (vd: `123456789VTP`).
- `ORDER_REFERENCE`: Mã đơn hàng đối ứng trong CRM (vd: `CHYSHOP101` hoặc `ORD-xxxx`).
- `ORDER_STATUS`: Mã trạng thái số (100, 102, 500, 501, 502, 503, 504, 505, 510, 515).
- `STATUS_NAME`: Tên hiển thị trạng thái tiếng Việt.
- `MONEY_COLLECTION`: Số tiền thu hộ COD.
- `TOKEN`: Chuỗi bí mật dùng để xác thực webhook (`StoreIntegration.metadata.webhookSecret`).

