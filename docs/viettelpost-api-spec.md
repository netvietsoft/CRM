# ViettelPost partner2 — API spec (trích từ tài liệu/SPA, 2026-06-29)

> Dùng để CẮM các API outbound (tạo đơn, sửa đơn, cập nhật trạng thái, tra cứu, tính cước).
> Nguồn: reverse-engineer SPA `partner2.viettelpost.vn` (i18n + JS chunks) — KIỂM CHỨNG lại khi gọi thật.

## Hosts (QUAN TRỌNG)
- **API thật (PROD)**: `https://partner.viettelpost.vn/v2/`  ← gọi API ở đây
- **API (DEV)**: `https://partnerdev.viettelpost.vn/v2/` (riêng categories có bản v3: `/v3/categories/listProvinceNew`)
- `https://partner2.viettelpost.vn` = **chỉ là trang tài liệu/portal** (gọi `/v2/order/*` ở đây trả 405 — KHÔNG phải API host).
- Mọi call: `POST`, header `Token: <token>`, `Content-Type: application/json`.

## Token-authen (xác thực)
3 cách lấy token (header `Token`):
1. **Login** → token ngắn hạn: `POST /v2/user/Login` (dev) · `POST /v2/user/LoginVTP` (prod), body `{ "USERNAME": "...", "PASSWORD": "..." }` → response có field `token`.
2. **ownerconnect** → token dài hạn (hạn ~1 năm): `POST /v2/user/ownerconnect`, header `Token` = token bước 1, body `{ "USERNAME": "...", "PASSWORD": "..." }` → `token` dài hạn. (Cơ chế uỷ quyền: token của tài khoản cấp quyền.)
3. **Tham số bí mật**: tạo token trên `https://viettelpost.vn/cau-hinh-tai-khoan` (Thêm token → OTP → copy). Dùng trực tiếp làm header `Token`.
   → Token hiện lưu trong CRM `StoreIntegration.accessToken = 5964783EFC895F4C2F16DA067DC3A96B` NHIỀU KHẢ NĂNG là loại này (cần xác nhận còn hạn/đúng tài khoản).

⚠️ Test `getPriceNlp` trên host đúng trả **400** (endpoint/host/method ĐÚNG, nhưng payload hoặc token chưa chuẩn) — chưa xác nhận token hợp lệ. Cần USERNAME/PASSWORD để Login, hoặc xác nhận token bí mật.

## Endpoints đơn (POST, host PROD partner.viettelpost.vn/v2/)
| Doc slug | Endpoint | Việc |
|---|---|---|
| create-order-id-address | `order/createOrder` | Tạo đơn bằng ID địa chỉ (PROVINCE_ID/DISTRICT_ID/WARDS_ID) |
| create-by-detail-address | `order/createOrderNlp` | Tạo đơn bằng địa chỉ text (NLP tự chuẩn hoá) |
| update-info-order | `order/edit` | Sửa thông tin đơn (chỉ khi `ORDER_STATUS < 200`) |
| update-bill-of-lading-status | `order/UpdateOrder` | Cập nhật trạng thái vận đơn — hành vi theo tham số `TYPE` |
| (tra cứu) | `order/detail` | Chi tiết đơn (nguồn enrich SĐT/địa chỉ khách — cần kiểm chứng method/param) |
| (cước) | `order/getPriceNlp`, `order/getPriceAll`, `order/getPriceAllNlp` | Tính cước |
| (khác) | `order/list`, `order/printing`/`printing-code` | Danh sách đơn / link in |
| (địa chỉ) | `categories/listProvinceNew` (v3), `categories/listDistrict?provinceId=`, `categories/listWard` | Lấy ID tỉnh/huyện/xã để map cho createOrder |

## Field request createOrder / createOrderNlp / edit (trích)
- **Người gửi**: `SENDER_FULLNAME`, `SENDER_ADDRESS`, `SENDER_PHONE`, `SENDER_EMAIL`
- **Người nhận**: `RECEIVER_FULLNAME`, `RECEIVER_ADDRESS`, `RECEIVER_PHONE`, `RECEIVER_EMAIL`, `RECEIVER_PROVINCE`, `RECEIVER_DISTRICT`, `RECEIVER_WARD` (createOrder dùng ID: `PROVINCE_ID`/`DISTRICT_ID`/`WARDS_ID`)
- **Hàng**: `PRODUCT_NAME`, `PRODUCT_PRICE`, `PRODUCT_WEIGHT`, `PRODUCT_QUANTITY`, `PRODUCT_TYPE`, `PRODUCT_LENGTH/WIDTH/HEIGHT`, `PRODUCT_DETAIL`, `LIST_ITEM`
- **Đơn/tiền**: `ORDER_PAYMENT`, `ORDER_SERVICE`, `ORDER_SERVICE_ADD`, `ORDER_NOTE`, `ORDER_VOUCHER`, `MONEY_COLLECTION`(COD), `MONEY_TOTAL`, `MONEY_FEE`, `MONEY_TOTAL_FEE`, `MONEY_VAT`, `MONEY_VAS`, `MONEY_COLLECTION_FEE`, `MONEY_OTHER_FEE`, `EXTRA_MONEY`, `GROUPADDRESS_ID`, `DELIVERY_DATE`, `EXCHANGE_WEIGHT`
- Lưu ý: field String maxlength mặc định 150 bytes.

## Field UpdateOrder (cập nhật trạng thái vận đơn)
`ORDER_NUMBER`, `TYPE` (quyết định hành động), `NOTE`, `MONEY_COLLECTION`, `MONEY_*`, `RECEIVER_PROVINCE/DISTRICT/WARD`, `EXCHANGE_WEIGHT`, `IS_TEXT_NOTE_HEADER`.

## Webhook (inbound — ĐÃ LÀM) — field payload.DATA
`ORDER_NUMBER`, `ORDER_REFERENCE`, `ORDER_STATUS`, `ORDER_STATUSDATE`, `STATUS_NAME`, `MONEY_COLLECTION`, `MONEY_COLLECTION_ORIGIN`, `MONEY_FEECOD`, `MONEY_TOTAL`, `MONEY_TOTALFEE`, `MONEY_TOTALVAT`, `PRODUCT_WEIGHT`, `ORDER_SERVICE`, `ORDER_SERVICE_ADD`, `ORDER_PAYMENT`, `EXPECTED_DELIVERY(_DATE)`, `NOTE`, `ORDER_NOTE`, `LOCATION_CURRENTLY`, `RECEIVER_FULLNAME`, `EMPLOYEE_NAME/PHONE`, `IS_RETURNING`, `REASON_CODE`, `GROUPADDRESS_ID`, `DETAIL[]`, `POD`, `VOUCHER_VALUE` + `TOKEN`(secret). Webhook KHÔNG có SĐT/địa chỉ khách → enrich qua `order/detail`.

## Còn cần để cắm outbound
1. **Xác thực**: USERNAME/PASSWORD tài khoản partner (để Login+ownerconnect) HOẶC xác nhận token bí mật `5964783…` còn hạn.
2. Kiểm chứng method/param chính xác của `order/detail` (enrich khách) + `getPriceNlp` (payload đúng) bằng token hợp lệ.
