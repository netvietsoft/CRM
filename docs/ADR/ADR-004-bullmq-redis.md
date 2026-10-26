# ADR-004: Lựa chọn BullMQ & Redis cho Xử lý Tác vụ Nền

- **Trạng thái**: ACCEPTED
- **Ngày**: 2026-06-15
- **Người đề xuất**: Architect Agent

---

## 1. Bối cảnh (Context)
Các tác vụ như gửi tin nhắn SMS hàng loạt, kéo dữ liệu báo cáo quảng cáo Meta Ads, mở khóa voucher theo thời gian (7 ngày) và đồng bộ đơn hàng đòi hỏi xử lý bất đồng bộ (Asynchronous Background Jobs) kèm cơ chế retry và rate-limiting.

---

## 2. Quyết định (Decision)
Sử dụng **BullMQ** kết hợp **Redis** làm Message Queue chính thức của hệ thống.

---

## 3. Lý do (Rationale)
1. **Khả năng chịu tải cao**: BullMQ xử lý hàng nghìn job/giây trên Redis in-memory.
2. **Cơ chế Retry & Backoff**: Tự động thử lại khi gửi SMS hoặc gọi API bên ngoài bị nghẽn mạng.
3. **Delayed Jobs**: Hỗ trợ hẹn giờ mở khóa voucher sau 7 ngày cực kỳ chính xác.
4. **BullBoard Dashboard**: Có sẵn giao diện theo dõi hàng đợi trực quan tại `/admin/queues`.

---

## 4. Tác động & Fallback (Consequences)
- Khi phát triển local không có Redis, hệ thống tự động fallback thực thi inline đồng bộ mà không gây crash ứng dụng.

