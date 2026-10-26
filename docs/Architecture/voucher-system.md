# 🎟️ BẢN ĐỒ VÒNG ĐỜI HỆ THỐNG VOUCHER & LOYALTY (docs/Architecture/voucher-system.md)

---

## 1. Phân loại Voucher trong Hệ thống

1. **Voucher Sàn / Cửa hàng (Catalog Vouchers)**:
   - Loại: `PERCENT`, `FIXED_AMOUNT`, `FREESHIP`, `STACK`.
   - Phân nhóm: `WELCOME`, `VIP`, `BUNDLE`, `FREESHIP`, `GAMIFICATION`, `REFERRAL`, `BIRTHDAY`.
2. **Order Voucher Loyalty (Voucher Thưởng Đơn Hàng)**:
   - Tự động sinh mã voucher `QR-ORDER-{code}` khi nhân viên lên đơn hoặc qua cấu hình tự động.
   - Thưởng khi đơn hàng đạt ngưỡng COD (`totalAmount >= 100.000đ`) và giao thành công.
3. **QR Voucher Claim**:
   - Khách quét mã QR in trên hóa đơn/thẻ bảo hành, gửi OTP xác thực SĐT để nhận voucher vào ví.

---

## 2. Vòng đời Trạng thái UserVoucher (State Machine)

```
                       ┌──────────────────────────────────────────────────────────┐
                       │                     TẠO VOUCHER                          │
                       │              (Đơn hàng / QR / Spin)                      │
                       └────────────────────────────┬─────────────────────────────┘
                                                    │
                                                    ▼
                                       ┌─────────────────────────┐
                                       │         PENDING         │
                                       │ (Chờ đơn giao / Khóa 7d)│
                                       └────────────┬────────────┘
                                                    │
                   ┌────────────────────────────────┴────────────────────────────────┐
                   │ Đơn giao thành công (501/515)                                    │ Đơn hoàn / Hủy / Đơn đổi
                   ▼                                                                 ▼
      ┌─────────────────────────┐                                      ┌─────────────────────────┐
      │     approvalMode?       │                                      │        REJECTED         │
      └────────────┬────────────┘                                      │    (Từ chối sử dụng)    │
                   │                                                   └─────────────────────────┘
         ┌─────────┴─────────┐
    AUTO │            MANUAL │
         ▼                   ▼
┌─────────────────┐ ┌───────────────────┐
│     ACTIVE      │ │ WAITING_APPROVAL  │ ──(Admin duyệt)──▶ [ ACTIVE ]
│ (Khả dụng ví KH)│ │  (Chờ Admin bấm)  │
└────────┬────────┘ └───────────────────┘
         │
         │ Khách áp mã vào đơn mới
         ▼
┌─────────────────┐
│     isUsed      │
│  (Đã sử dụng)   │
└─────────────────┘
```

### Các trạng thái chuẩn của `UserVoucher.status`:
- **`PENDING`**: Voucher vừa được tạo, đang chờ đơn hàng giao thành công hoặc đang bị khóa theo thời gian chờ (lock 7 ngày).
- **`WAITING_APPROVAL`**: Đơn hàng đã giao thành công nhưng ở chế độ duyệt thủ công (`approvalMode: MANUAL`), đang chờ quản trị viên bấm duyệt.
- **`ACTIVE`**: Voucher đã được kích hoạt hợp lệ, khách hàng có thể áp dụng khi thanh toán.
- **`REJECTED`**: Voucher bị từ chối do đơn hàng gốc bị hủy, chuyển hoàn, đơn đổi hoặc COD không đủ ngưỡng.

