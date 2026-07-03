# commissions — Hoa hồng multi-level qua closure table (referral)
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/ (đặc biệt docs/02 mục COMMISSIONS).

## File chính
- `commissions.controller.ts` — endpoint: GET /commissions/network, /ledger, /configs; admin: /admin/ledger, /admin/stats, /admin/configs, /admin/referral-stats, /admin/top-referrers, PUT /admin/configs.
- `commissions.service.ts` — `calculateCommissions(order)` (tạo hoa hồng khi đơn COMPLETED) + `cancelCommissions` (huỷ đơn → trừ lại balance, giữ bản ghi).

## Luồng / logic quan trọng (gotcha)
- **Closure table**: lấy CommissionConfig active theo level → truy `ReferralClosure` tìm ancestor (depth>0) của KH → ancestor depth N khớp config level N (`level === depth`) → amount = totalAmount × percentage/100 → tạo `CommissionLedger` (status APPROVED) + tăng `commissionBalance`.
- **Huỷ đơn** → `cancelCommissions`: status CANCELLED, trừ lại balance, GIỮ bản ghi (không xoá).
- **Bất đối xứng mốc cộng/huỷ**: cộng hoa hồng và huỷ hoa hồng có thể ở mốc trạng thái khác nhau (DELIVERED vs COMPLETED) — kiểm tra kỹ trong orders.service trước khi sửa.
- Caller (orders.service) đã chống tạo trùng — nhưng service này CHƯA có unique constraint riêng.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- 🔴 `commissions.service.ts:8-70` — `calculateCommissions` KHÔNG transaction + nuốt lỗi → lệch `commissionBalance`. **Sửa:** bọc `prisma.$transaction`; thêm unique `(orderId,userId,level)` chống tạo trùng (bàn vì DB đã import dump).
- 🟡 `orders.service.ts:1850-1910` — bất đối xứng mốc cộng/huỷ hoa hồng (DELIVERED vs COMPLETED) + dính enum sai `'RETURNED'` (đúng là `RETURNING`) khiến nhánh huỷ hoa hồng không chạy.

## Quy ước khi sửa
- **Tiền tệ**: VND số nguyên đồng. Đừng tự chế công thức nhân % — theo cách hiện có.
- **$transaction cho mọi thao tác đụng tiền** (balance + ledger phải atomic).
- Map `level === depth` của closure table — không đổi ngữ nghĩa này.
- Endpoint admin gắn đủ guard + @Roles + @Permissions.
