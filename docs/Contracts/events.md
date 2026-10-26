# 🔔 DANH MỤC SỰ KIỆN & WEBHOOK EVENTS (docs/Contracts/events.md)

---

## 1. Sự kiện Nội bộ Hệ thống (Internal Automation Events)

| Tên Sự kiện | Trigger | Hành vi kích hoạt |
|---|---|---|
| `order.created` | Khách/Admin đặt đơn mới | Gửi SMS cảm ơn, tạo thông báo Admin qua WebSocket |
| `order.status.changed` | Đơn hàng đổi trạng thái | Kích hoạt kịch bản CSKH tự động, gửi thông báo vận chuyển |
| `order.completed` | Đơn giao & thu tiền xong | Tính toán hoa hồng Referral (`CommissionLedger`), tăng `totalSpent`, tăng Rank |
| `order.cancelled` | Đơn bị hủy / hoàn | Hoàn lại tồn kho, hủy hoa hồng liên kết, nhả voucher |
| `voucher.claimed` | Khách claim mã QR thành công | Gửi thông báo mã voucher vào ví khách |
| `customer.birthday` | Cron 8:00 sáng | Tự động gửi SMS chúc mừng kèm quà tặng sinh nhật |

---

## 2. Sự kiện WebSocket Realtime (`/admin` Namespace)

| Event Name | Payload | Mô tả |
|---|---|---|
| `new_admin_notification` | `{ id, type, title, message, link, createdAt }` | Đẩy thông báo chuông cho Admin/NV |
| `messenger:message` | `{ conversationId, messageId, text, sender }` | Realtime tin nhắn mới trong CCM Live Chat |
| `order:update` | `{ orderId, orderCode, newStatus }` | Cập nhật dòng đơn hàng trên màn hình Admin |

