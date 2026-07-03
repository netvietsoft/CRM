# 08 — Meta Ads Dashboard UI + Thống kê tiền hàng Viettel

> Các phần đã làm trong phiên 2026-06-30 (UI Meta Ads + nền tảng thống kê Viettel).
> Backend số liệu: xem `docs/05-integrations-webhooks.md` (mục 0 — Meta Ads).

---

## 1. Trang Meta Ads (`/admin/adsmeta/<accountId>` và `/admin/adsmeta/accall`)

Component dùng chung: `components/admin/AdsDashboard.tsx` (client). Lấy số liệu từ
`/ads/summary`, `/ads/campaigns`, drill-down `/ads/campaigns/:id/adsets` &
`/ads/adsets/:id/ads`. Mặc định bộ lọc = **Hôm nay**.

### 1.1. Dashboard KPI (thẻ tổng)
- Lưới **7 cột** thẻ gọn. Mặc định: Chi tiêu · Kết quả · Tổng giá trị lượt mua ·
  Avg ROAS · Avg Ads Cost · Avg CP/kết quả · Hiển thị · Click · CTR.
- **Setting (⚙ Chỉ số)**: popup tích chọn chỉ số hiện (13 loại, gồm cả Tiếp cận,
  Click duy nhất, CPC, CPM) + nút *Chọn tất cả* / *Mặc định*.
- **Kéo–thả** thẻ KPI để đổi thứ tự.
- Lưu cấu hình vào `localStorage` key `adsDash.kpis.v1` (`{order, visible}`).

### 1.2. Bộ lọc + tìm nhanh khoảng ngày
- Tài khoản (điều hướng URL) · Từ ngày · Đến ngày.
- Nút preset: **Hôm nay · Hôm qua · Tuần này · Tuần trước · Tháng này · Quý này · Tất cả**.
  Tuần tính từ Thứ 2; ngày theo giờ local (helper `presetRange`, `ymd`). Nút khớp
  khoảng đang chọn được tô xanh `#375DED` (active). Đổi ngày → tự refetch + reset drill-down.

### 1.3. Bảng chiến dịch (drill-down 3 cấp)
- Cột: Chiến dịch · Trạng thái · Mục tiêu · Chi tiêu · Hiển thị · Click · CTR · CPC ·
  CPM · Kết quả · CP/kết quả · **Giá trị mua · ROAS · % Ads Cost** · (Tiếp cận, Ngân sách: ẩn mặc định).
- **Drill-down**: click ▶ ở dòng Chiến dịch → xổ **Nhóm QC** (ad set); click tiếp →
  **Quảng cáo** (ad). Dữ liệu lazy-load, cùng bộ cột. Cấp con thụt lề + nền nhạt dần.
- **Loại kết quả**: cột "Kết quả" hiện nhãn loại bên dưới số (vd *Lượt mua*, *Tin nhắn bắt đầu*) —
  suy từ `actions` theo ưu tiên (mua > lead > tin nhắn > click).
- **Cột động (FB)**: mỗi `action_type` có trong dữ liệu thành 1 cột (mua/tin nhắn/lead/
  thêm giỏ/xem video/tương tác…). Mặc định ẩn, bật trong popup ⚙ Cột (đánh dấu "FB").
- **Sort**: click tiêu đề (icon ▲/▼), cột số sort theo số, cột chữ theo alphabet.
- **Kéo–thả cột**: kéo tiêu đề để đổi vị trí ("Chiến dịch" ghim đầu vì chứa cây drill-down).
- **Ẩn/hiện cột**: nút ⚙ Cột → popup chia 2 nhóm (Cột cơ bản / Chỉ số FB) + *Chọn tất cả* /
  *Mặc định* / *Bỏ chọn hết*.
- **Menu thao tác dòng** (⋯): Sao chép ID · Mở Meta Ads Manager.
- Lưu thứ tự + cột hiện vào `localStorage` key `adsDash.cols.v1`.
- Style header: nền `#375DED`, chữ trắng đậm; sọc `#F5F9FC`; hover dòng `#EBEBEB`.

### 1.4. Backend phục vụ drill-down + chỉ số (xem 05)
- `GET /ads/campaigns/:id/adsets`, `GET /ads/adsets/:id/ads` — cùng shape với `/ads/campaigns`.
- `ads.service` gộp `actions`/`actionValues` (JSON) theo từng `action_type` → trả `metrics`,
  `resultType`, `purchaseValue` (dedup theo ưu tiên `omni_purchase`→pixel→…), `roas`, `adsCostPct`.
- `/ads/summary` bổ sung `purchaseValue` / `roas` / `adsCostPct`.

---

## 2. Sidebar admin (`components/admin/AdminSidebar.tsx`)
- Rộng `w-64` (256px).
- Nhãn nhóm: màu `#2140da`, in đậm, `text-sm`, hover `#18309c`.
- `isActive` dùng **khớp tiền tố dài nhất** (`ALL_HREFS`) → tránh route cha sáng cùng route con.

## 3. Viettel — modal "Sửa thông tin KH" (`app/admin/viettel-customers/customers/page.tsx`)
- Bỏ đóng-khi-click-nền cho modal Sửa (tránh lỡ tay mất nội dung); chỉ đóng bằng ✕/Hủy.
  Modal "Lịch sử mua" giữ nguyên.

## 4. Viettel — Thống kê tiền hàng (backend, FE chưa làm)
- Spec: `docs/superpowers/specs/2026-06-30-viettel-revenue-stats-design.md`.
- DB: thêm cột `send_date` (ngày gửi, từ `ORDER_SYSTEMDATE`) + index trên `viettel_customers`
  (migration `20260630150000_add_viettel_send_date`). Backfill: `scripts/backfill-viettel-send-date.ts`.
- Sync gán `sendDate` (webhook + enrich).
- Endpoint `GET /viettelpost/revenue-stats?from&to` → gộp count/cod/fee theo trạng thái + tổng.
  Test: `viettel-customer.revenue.spec.ts`.
- ⏳ **Chưa làm**: trang FE `/admin/viettel-customers/revenue` (vẫn placeholder) + map nhóm trạng thái.
