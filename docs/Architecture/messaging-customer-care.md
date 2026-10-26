# 📱 HỆ THỐNG CSKH ĐA KÊNH & NHẮN TIN TỰ ĐỘNG (docs/Architecture/messaging-customer-care.md)

> Vị trí mã nguồn: `backend-nestjs/src/messaging` (+ `src/modules/admin-notifications`, `src/integrations/sms`).  
> Giao diện Quản trị: `frontend/src/app/admin/customer-care/*`.

---

## 1. Luồng Hoạt động Tổng thể (End-to-End Workflow)

```
Mẫu tin (Template) ──────┐
                         ├─▶ Chiến dịch (Campaign) ─▶ Tệp nhận (Audience) ─▶ Lập lịch / Tự động (BullMQ) ─▶ Nhà cung cấp (SMS/Zalo) ─▶ Sổ nhật ký (MessageLog)
Bộ lọc KH / Nhập Excel ──┘
```

1. **Template**: Định nghĩa mẫu nội dung tin nhắn hỗ trợ chèn biến động `{{ customer_name }}`, `{{ order_code }}`, `{{ total_amount }}`...
2. **Audience**: Lọc danh sách khách hàng tự động theo Rank, tổng chi tiêu, trạng thái đơn hàng hoặc import file Excel/CSV.
3. **Trigger / Automation**: Gửi ngay lập tức, gửi theo lịch hẹn giờ hoặc kích hoạt tự động theo sự kiện:
   - Khi đơn hàng tạo mới (`ORDER_CREATED`).
   - Khi đơn giao thành công (`ORDER_DELIVERED`).
   - Khen thưởng sinh nhật (`BIRTHDAY_TODAY` - 8:00 sáng).
   - Nhắc nhở voucher sắp hết hạn (`VOUCHER_EXPIRING` - 8:05 sáng).
   - Khách hàng có nguy cơ rời bỏ (`CUSTOMER_INACTIVE_30D` - 8:10 sáng).
4. **Provider**: Gửi qua NetViet SMS HTTP Gateway (định dạng `84xxxxxxxxx`).

---

## 2. Các Cơ chế An toàn Cốt lõi
- **Idempotency (Chống gửi trùng)**: Sinh `idempotencyKey` bằng SHA-256 từ `(channel + recipient + template + content + campaign + vars)`. Nếu gửi trùng, hệ thống trả về log cũ mà không gửi lại SMS thật.
- **Cooldown & Tần suất gửi**: Giới hạn tối đa 1 tin nhắn Marketing/ngày/khách hàng (tin Transactional/OTP có cooldown = 0).
- **Opt-out (Danh sách từ chối nhận tin)**: Bảng `MessageOptOut` tự động chặn gửi và ghi log `status: SKIPPED`.
- **Circuit Breaker (Tự dừng chiến dịch khi lỗi cao)**: Tự động pause chiến dịch nếu tỷ lệ gửi lỗi vượt quá 50% sau 5 lần thất bại liên tiếp.

