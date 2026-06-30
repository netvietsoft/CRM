# Thống kê tiền hàng (ViettelPost) — Design

Ngày: 2026-06-30 · Trang: `/admin/viettel-customers/revenue` (tab "Thống kê").

## Mục tiêu
Thay placeholder bằng trang thống kê tiền hàng theo trạng thái, lọc theo **ngày gửi**
(`ORDER_SYSTEMDATE`), hiển thị 3 thẻ tổng + biểu đồ tròn + 2 bảng (Trạng thái / Trạng thái khác),
khớp mẫu của Viettel Post.

Ngoài scope (làm sau): tab "Dòng tiền", dropdown chế độ COD ("COD gồm cước người nhận trả").
COD = cột `cod` trực tiếp.

## Backend (`backend-nestjs`)
1. **Migration**: `viettel_customers` thêm `send_date DATETIME NULL` + `@@index([sendDate])`.
2. **Sync**: `viettel-customer.service` upsert gán `sendDate = parseDate(d.ORDER_SYSTEMDATE)`.
3. **Backfill**: `scripts/backfill-viettel-send-date.ts` — đơn cũ: đọc `ORDER_SYSTEMDATE` từ
   `detail_payload`, set `send_date`. In số dòng cập nhật.
4. **Endpoint** `GET /viettelpost/revenue-stats?from=YYYY-MM-DD&to=YYYY-MM-DD`
   → `service.getRevenueStats(from, to)`:
   - WHERE `tracking_code NOT LIKE 'DRAFT-%'` AND `send_date >= from` AND `send_date < to + 1 ngày`.
   - GROUP BY `status` → `count`, `SUM(cod)`, `SUM(money_total_fee)`.
   - Trả `{ from, to, totalOrders, totalCod, totalFee, byStatus: [{status, statusName, count, cod, fee}] }`.
   - `from`/`to` thiếu → mặc định đầu tháng hiện tại → hôm nay.
5. **Test**: `*.spec.ts` cho `getRevenueStats` (gộp count/cod/fee đúng; loại DRAFT; biên ngày).

## Frontend (`frontend`)
6. `src/lib/vtpStatusGroups.ts` — config:
   - `STATUS_GROUP: Record<number, { group: string; table: 'main' | 'other' }>`
   - `MAIN_GROUPS: string[]` (11), `OTHER_GROUPS: string[]` (9) — đúng thứ tự ảnh.
   - `GROUP_COLOR: Record<string, string>`.
   - Mã không có trong map → group "Khác" (table 'other'), KHÔNG mất đơn.
7. `src/app/admin/viettel-customers/revenue/page.tsx` (client):
   - 2 `<input type="date">` (from/to), mặc định đầu tháng → hôm nay; đổi → refetch.
   - Tab bar "Thống kê | Dòng tiền" (Dòng tiền = placeholder).
   - 3 thẻ: Số đơn / Tổng tiền thu hộ / Tổng tiền cước (format VND).
   - Biểu đồ tròn **SVG thuần** theo nhóm chính + chú thích màu.
   - 2 bảng cố định (hiện cả dòng 0 đơn): cột Trạng thái · Số đơn · Tiền thu hộ (VND) · Tiền cước.
   - Loading / error / empty theo pattern trang `customers/page.tsx`.

## Bảng map trạng thái (NHÁP — cần xác nhận nghiệp vụ)
Dựa trên mã Viettel quan sát được + taxonomy chuẩn. Mã có dấu `?` là phỏng đoán, sửa khi review.

| Mã VTP | Nhóm hiển thị | Bảng |
|---|---|---|
| 100 | Tạo mới | other |
| 101, 103 | Đã tiếp nhận | other |
| 104, 105 | Đang lấy hàng | other |
| 107 | Tồn - Lấy không thành công | other |
| 200, 201, 202 | Đã lấy hàng | main |
| 300, 301, 302, 303, 320, 400, 401, 402 | Đang vận chuyển | main |
| 500 | Đang giao hàng | main |
| 502?, 503, 506 | Chờ phát lại | main |
| 501, 515 | Giao thành công | main |
| 102 | Chờ xử lý | main |
| 507? | Đã duyệt hoàn | main |
| 505, 508?, 509? | Đang chuyển hoàn | main |
| 504 | Đã trả | main |
| 550?, 551?, 570? | Xử lý đền bù | main |
| -100, -101, -102 | Shop hủy lấy | other |
| -108, -109, -110 | VTP hủy lấy | other |
| (mã khác) | Khác | other |

Nhóm trong ảnh chưa chắc mã: "Phát tiếp", "Đã hủy giao", "Đang xác minh bồi thường",
"Đã bồi thường" → để trống map ban đầu (0 đơn), bổ sung khi có mã thực tế.
