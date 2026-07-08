# Spec: Voucher theo Đơn hàng — tạo, kích hoạt, hiển thị (Đơn hàng + Khách hàng)

> **Ngày:** 2026-07-08. **Bối cảnh nền:** đọc kèm `docs/voucher-system-map.md` (bản đồ hệ voucher hiện tại).
> **Mục tiêu:** Mỗi đơn hàng có 1 voucher + QR riêng do **nhân viên tạo tay** qua form ngay dưới đơn; voucher **tự vào ví khách ở trạng thái CHỜ**; chỉ **kích hoạt khi giao hàng thành công + COD ≥ 100K**; hỗ trợ **duyệt Auto/Manual**; đơn hủy/hoàn/đổi/giao-thất-bại thì **không kích hoạt**.

---

## 1. Yêu cầu đã chốt (nguồn: trao đổi với chủ dự án)

| # | Yêu cầu | Ghi chú |
|---|---|---|
| R1 | **KHÔNG auto-sinh.** Nhân viên tự tạo voucher; hiển thị **form tạo voucher inline ngay dưới mỗi Đơn hàng** cho tiện. | Mở rộng `CreateOrderVoucherButton` (nút→modal) thành form hiện sẵn. |
| R2 | Voucher **kích hoạt khi giao hàng thành công**; có cột **duyệt Auto / Manual** trên mỗi voucher. | Manual = admin bấm "Duyệt" mới kích hoạt dù đã giao. |
| R3 | Đơn **hủy / hoàn / đổi / giao không thành công** → voucher **không kích hoạt**. | Giao thất bại = mã VTP; đơn đổi = ô tích "Đơn đổi". |
| R4 | Mỗi đơn có **1 voucher + 1 QR riêng**. | Đã sẵn model: `UserVoucher.sourceOrderCode` unique, code `QR-ORDER-{orderCode}`. |
| R5 | Tạo voucher → **ví khách hiển thị voucher CHỜ kích hoạt ngay**. | Trạng thái PENDING, có thông báo chờ. |
| A | Khách **định danh theo SĐT**; lần đầu nhập đúng SĐT mua hàng + **OTP** → vào hệ thống thông tin khách. | OTP = định danh/đăng nhập lần đầu, KHÔNG phải claim từng voucher. |
| C | Cột duyệt đặt ở **từng voucher** (Auto/Manual). Manual → CHỜ đến khi admin **Duyệt**. | |
| D | Voucher **tự hiện vào ví** (không cần quét để nhận). **QR = link XEM trạng thái** voucher, có thông báo "chỉ kích hoạt khi nhận hàng thành công". | |
| E | Voucher **chỉ kích hoạt khi: giao thành công VÀ COD ≥ 100K**. Giao thành công nhưng **COD < 100K → không kích hoạt**. | Ngưỡng 100K cấu hình được (mặc định 100.000đ). |
| E2 | **Ô tích "Đơn đổi"** trên đơn: khi bật → chặn kích hoạt voucher + **tự ghép nội dung vào ghi chú đơn** và đẩy kèm sang Viettel. | |

---

## 2. Ánh xạ trạng thái (dữ kiện code đã verify)

**`OrderStatus`:** PENDING, WAITING_FOR_GOODS, CONFIRMED, PACKAGING, WAITING_FOR_SHIPPING, SHIPPED, DELIVERED, PAYMENT_COLLECTED, RETURNING, **EXCHANGING**, COMPLETED, CANCELLED, REFUNDED.

**Nhóm cho voucher:**
- **GIAO THÀNH CÔNG** (điều kiện kích hoạt): `DELIVERED`, `PAYMENT_COLLECTED`, `COMPLETED`.
- **HỎNG / KHÔNG KÍCH HOẠT** (→ REJECTED): `CANCELLED`, `REFUNDED`, `RETURNING`, `EXCHANGING`, hoặc **cờ đơn đổi** bật.
- **CHỜ**: mọi trạng thái còn lại (chưa giao xong).

**VTP → OrderStatus** (`viettelpost-sync.service.ts:41-48`): 501/515→DELIVERED; 500/505→PAYMENT_COLLECTED; 502/510→RETURNING; 503/504/107→CANCELLED. ⇒ "giao không thành công" tự phản ánh vào `OrderStatus` qua cron reconcile 10 phút; **không cần đọc mã VTP riêng cho voucher**, chỉ cần đọc `order.status`.

**COD:** dùng `Order.totalAmount` (số tiền thu khi giao). Ngưỡng so sánh: `totalAmount >= codThreshold` (mặc định 100.000).

---

## 3. Máy trạng thái voucher (UserVoucher của đơn)

```
NV tạo voucher cho đơn (form dưới đơn)
        │  (gắn theo SĐT khách → User; QR-ORDER-{code})
        ▼
   PENDING  ── ví khách hiện "🕒 Voucher chờ kích hoạt — kích hoạt khi nhận hàng thành công"
        │
        ├── order.status ∈ {DELIVERED, PAYMENT_COLLECTED, COMPLETED}
        │       AND totalAmount ≥ codThreshold
        │       AND KHÔNG đơn đổi / KHÔNG hủy-hoàn-return
        │        │
        │        ├── approvalMode = AUTO  ─────────────► ACTIVE (dùng được)
        │        └── approvalMode = MANUAL ──► WAITING_APPROVAL
        │                                         │ (admin bấm "Duyệt")
        │                                         └────► ACTIVE
        │
        └── order.status ∈ {CANCELLED, REFUNDED, RETURNING, EXCHANGING}
                OR isExchange = true
                OR (đã chốt giao nhưng totalAmount < codThreshold)
                 └────────────────────────────────────► REJECTED (không kích hoạt)
```

- `WAITING_APPROVAL` = **trạng thái mới** (đã đủ điều kiện giao nhưng chờ admin duyệt vì Manual).
- Sau khi `ACTIVE`, dùng vào đơn khác như voucher thường (giữ nguyên logic áp dụng ở `orders.service.create`).
- `REJECTED` là chốt: đơn hỏng thì voucher mất hiệu lực vĩnh viễn.

---

## 4. Thay đổi Data model (`prisma/schema.prisma`)

1. **`Voucher`** (template order-voucher) — thêm:
   - `approvalMode  ApprovalMode @default(AUTO) @map("approval_mode")` — enum mới `enum ApprovalMode { AUTO MANUAL }`.
2. **`UserVoucher`** — thêm:
   - cập nhật enum `status` để công nhận thêm giá trị **`WAITING_APPROVAL`** (hiện `status` là String tự do — giữ String, chuẩn hoá tập giá trị: `PENDING | WAITING_APPROVAL | ACTIVE | REJECTED`).
   - `approvedAt   DateTime? @map("approved_at")`
   - `approvedById String?  @map("approved_by_id")` (admin duyệt manual).
3. **`Order`** — thêm:
   - `isExchange   Boolean @default(false) @map("is_exchange")` — cờ "Đơn đổi".
4. **`SystemConfig`** — key mới `order_voucher_config`: `{ codActivationThreshold: number }` (mặc định 100000). *(Đặt riêng, không nhét vào `qr_voucher_default`.)*

> Migration: tất cả cột thêm đều nullable/có default → **an toàn, additive**. Enum `ApprovalMode` mới. Không đổi FK.

---

## 5. Backend

### 5.1 Tạo voucher cho đơn (mở rộng cái đã có)
- Endpoint giữ nguyên `POST /vouchers/create-order-voucher`, **thêm field** `approvalMode` (AUTO|MANUAL).
- Khi tạo: tạo `Voucher` (QR-ORDER-{orderCode}, GAMIFICATION) **+ tạo luôn `UserVoucher` cho khách của đơn** (gắn theo `order.userId`), `status='PENDING'`, `sourceOrderCode=orderCode`, `approvalMode` sao chép từ voucher.
  - Nếu đơn **chưa gắn User** (khách chưa định danh): vẫn tạo `Voucher`+QR; `UserVoucher` tạo khi SĐT được nối vào User (xem 5.4). *(Thực tế hệ đã auto-tạo User theo SĐT ở nhiều luồng — cần xác nhận đơn CCM có `userId` không; nếu có thì gắn ngay.)*
- 1 voucher / đơn: chặn tạo trùng theo `sourceOrderCode` (đã unique ở DB).

### 5.2 Engine kích hoạt (sửa logic hiện tại)
- Hiện: PENDING→ACTIVE khi "delivered + PAID" (cron `verify-qr-vouchers-job` + side-effect mở ví).
- **Sửa điều kiện** thành:
  ```
  eligible = order.status ∈ {DELIVERED, PAYMENT_COLLECTED, COMPLETED}
             && order.totalAmount >= codThreshold
             && order.isExchange == false
  reject   = order.status ∈ {CANCELLED, REFUNDED, RETURNING, EXCHANGING} || order.isExchange
  ```
  - `reject` → `REJECTED`.
  - `eligible && approvalMode=AUTO` → `ACTIVE`.
  - `eligible && approvalMode=MANUAL` → `WAITING_APPROVAL`.
- **Trigger kích hoạt**: hook ngay trong `orders.updateStatus` (khi status đổi) **và** giữ cron reconcile làm lưới an toàn (vì VTP cập nhật qua cron 10'). ⚠️ Redis tắt thì cron BullMQ tắt — nên đặt hook đồng bộ trong `updateStatus` là chính, cron chỉ phụ.

### 5.3 Duyệt Manual
- `POST /vouchers/order-voucher/:userVoucherId/approve` (ADMIN/MODERATOR) → chỉ cho phép khi đang `WAITING_APPROVAL` → set `ACTIVE`, `approvedAt`, `approvedById`.

### 5.4 Định danh khách theo SĐT + OTP (yêu cầu A)
- Khách mở link QR (hoặc app) lần đầu → nhập **SĐT** → `POST /vouchers/send-otp` (đã có) → nhập OTP → xác thực.
- Khi xác thực đúng SĐT: **đăng nhập/định danh** vào User theo SĐT (tạo User CUSTOMER nếu chưa có), rồi **nối mọi `UserVoucher`/đơn theo SĐT** vào User đó → ví hiển thị.
- *(Tận dụng luồng OTP đã có ở `vouchers.service` claim-qr; đổi mục đích từ "claim voucher" sang "định danh + xem ví".)*

### 5.5 Cờ "Đơn đổi" (E2)
- Khi bật `isExchange=true` (lúc tạo/sửa đơn): prepend/append 1 dòng cố định vào `order.orderNote` (VD `"[ĐƠN ĐỔI] "`), và **đẩy kèm sang Viettel** theo luồng push `ORDER_NOTE` hiện có (`editAndPush`/tạo đơn VTP).
- `isExchange=true` → chặn kích hoạt voucher (mục 5.2).

### 5.6 QR = trang xem trạng thái (D) — dùng đăng nhập FE
- QR trỏ link (VD `/portal/voucher-status?orderCode=...`) → trang trạng thái voucher + thông báo *"Voucher chỉ được kích hoạt khi khách nhận hàng thành công."*
- **Bảo mật bằng đăng nhập FE khách** (không OTP riêng trên trang): trang yêu cầu khách đã đăng nhập; chưa đăng nhập → điều hướng sang đăng nhập (SĐT + OTP = luồng định danh 5.4). Sau đăng nhập, khách xem voucher của chính mình.
- Endpoint đọc trạng thái theo orderCode/voucher code, có kiểm tra voucher thuộc về user đang đăng nhập.

---

## 6. Frontend

### 6.1 Đơn hàng (admin — Chi tiết đơn)
- **Form tạo voucher inline** hiện sẵn dưới đơn (thay nút→modal): các field như order-voucher hiện có (`name`, `type`, `value`, `maxDiscount`, `minOrderValue`, `durationDays`, `perCustomerLimit`) **+ cột `approvalMode` (Auto/Manual)**.
- Nếu đơn đã có voucher: hiện voucher đó + **trạng thái** (CHỜ / CHỜ DUYỆT / ĐÃ KÍCH HOẠT / TỪ CHỐI) + nút **"Duyệt"** khi `WAITING_APPROVAL`.
- **Ô tích "Đơn đổi"** trên form đơn.

### 6.2 Đơn hàng (khách — `OrderDetailClient.tsx`)
- Hiện voucher của đơn + trạng thái chờ/kích hoạt (bổ sung: hiện **mã/tên voucher**, không chỉ số tiền — cần BE trả `appliedVouchers[].code` hoặc voucher của đơn).

### 6.3 Khách hàng (admin — `admin/customers/[id]/page.tsx`)
- Card Voucher: bổ sung **trạng thái** (PENDING/WAITING_APPROVAL/ACTIVE/REJECTED), `sourceOrderCode`, `unlockAt`.
- **Sửa BUG:** dòng 360 so `'PERCENTAGE'` → sửa thành `'PERCENT'` (đúng enum), nếu không voucher % hiển thị sai.

### 6.4 Ví khách (`portal/vouchers/page.tsx`)
- Voucher CHỜ hiện rõ "🕒 Chờ kích hoạt — kích hoạt khi nhận hàng thành công" + tham chiếu đơn nguồn. (UI PENDING đã có, bổ sung nhãn WAITING_APPROVAL.)

### 6.5 Trang xem trạng thái qua QR
- Trang công khai hiển thị trạng thái + thông báo (mục 5.6).

---

## 7. Ngoài phạm vi / giữ nguyên
- Không đổi logic **áp voucher vào đơn** (`orders.service.create`, trần 25%, 1 voucher/đơn) — chỉ đổi vòng đời KÍCH HOẠT.
- Không đụng voucher thường/referral/spin (chỉ order-voucher).
- `expirationDays` của qr-config vẫn để riêng (không thuộc spec này).

## 8. Quyết định đã chốt (review 2026-07-08)
1. **Đơn CCM CÓ gắn `order.userId`** → tạo voucher là **gắn `UserVoucher` vào khách ngay** (PENDING). Không cần luồng "chờ nối SĐT" cho đơn CCM. *(Luồng nối theo SĐT 5.4 vẫn giữ để phòng đơn không có userId, nhưng không phải case chính.)*
2. **COD = `Order.totalAmount`.** Viettel CÓ trả **số tiền COD** qua `detailPayload.MONEY_COLLECTION` (khớp `totalAmount`). **Trạng thái đã-nhận-COD** (đối soát) VTP KHÔNG trả qua API partner — chỉ có qua WEB token scrape (`codPayStatus`), fragile. ⇒ **Điều kiện kích hoạt dùng `order.status` (giao thành công) + `totalAmount ≥ ngưỡng`** — KHÔNG phụ thuộc `codPayStatus`.
3. **Ngưỡng COD để trong cấu hình** `SystemConfig.order_voucher_config.codActivationThreshold` (mặc định 100.000). ✅
4. **`approvalMode` đặt trên voucher của đơn** (mỗi đơn 1 giá trị). ✅
5. **Trang QR trạng thái dùng ĐĂNG NHẬP FE của khách** (không OTP riêng trên trang): QR → link trang trạng thái; trang dựa vào phiên đăng nhập khách hiện có (khách định danh bằng SĐT+OTP lần đầu = chính là đăng nhập). Khách đã đăng nhập → xem trạng thái/giá trị voucher của mình; chưa đăng nhập → điều hướng đăng nhập (SĐT+OTP).

---

## 9. Checklist thực thi (khi lên plan)
- [ ] Migration: `Voucher.approvalMode`, `UserVoucher.approvedAt/approvedById` + chuẩn hoá `status`, `Order.isExchange`, enum `ApprovalMode`, SystemConfig `order_voucher_config`.
- [ ] BE: create-order-voucher (+approvalMode, +tạo UserVoucher PENDING); engine kích hoạt (sửa điều kiện + hook updateStatus); endpoint approve; cờ isExchange→note→VTP; endpoint xem trạng thái theo QR; OTP định danh.
- [ ] FE: form voucher inline + ô Đơn đổi + nút Duyệt (Chi tiết đơn admin); trạng thái voucher ở đơn khách; card voucher khách hàng admin (+ fix bug PERCENT); ví khách nhãn chờ/chờ-duyệt; trang QR trạng thái.
- [ ] Test: máy trạng thái (PENDING→ACTIVE/WAITING_APPROVAL/REJECTED) theo từng nhánh; ngưỡng COD; đơn đổi; manual approve.
