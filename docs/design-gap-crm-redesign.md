# 🧩 GHÉP CRM REDESIGN — Tiến độ & phần thiếu (ghi nhớ)

> ✅ **2026-07-06: ĐÃ GHÉP XONG toàn bộ màn (Lô 1+2+3)** — Shell, Dashboard, Khách hàng(+lọc+chi tiết), Đơn hàng(+chi tiết), Sản phẩm(+form), Kho&danh mục, Nhân viên, Cửa hàng, Nguồn đơn, Ranks, Voucher, Vòng quay, Hoa hồng/Referral, Analytics/PnL+ad-map, System(QR/my-store), **Ads Meta**, **Khách hàng Viettel (5 tab)**, **CSKH (7 tab)**. FE typecheck sạch toàn dự án, wiring giữ nguyên. Các phần "GAP" bên dưới là chỗ **thiết kế có nhưng thiếu backend/data** → giữ template, cần bổ sung sau.


> Nguồn: `Newdesign/handoff_crm_redesign/` (`CRM Redesign.dc.html` + README/screen-map/icons).
> Nhánh: **`feat/ccm-redesign`** (chưa commit). Tokens CRM admin đã nạp vào `globals.css` @theme (`--color-crm-*`: primary `#2563eb`, app `#f7f8fb`, border `#eceef2`, th `#f9fafb`, zebra `#f7f9fc`, row-hover `#eff6ff`).
> Quy ước ghép: **reskin pixel-perfect, giữ nguyên wiring**. Mỗi `showToast()` trong prototype = điểm nối API thật.
> `can reuse old design`: nơi gói mới thiếu, dùng lại bản CCM (`design_handoff_crm_ccm`) hoặc giao diện hiện có.

## Trạng thái theo màn (data-screen-label → route)

| Màn | Route/Component | Dòng thiết kế | Trạng thái |
|---|---|---|---|
| Shell (sidebar+topbar) | AdminShell/Sidebar/Header/TopNav | 39–124 | 🔧 Lô 1 (đang ghép) |
| Dashboard | admin/page.tsx + RevenueStats | 125–226 | 🔧 Lô 1 |
| Khách hàng | admin/customers + CustomersTableClient | 227–309 | 🔧 Lô 1 |
| Chi tiết khách hàng | admin/customers/[id] | 310–382 | ⏳ Lô 2 |
| Đơn hàng | admin/orders + OrdersTableClient + OrderStatusFilter | 383–460 | 🔧 Lô 1 |
| Chi tiết đơn hàng | admin/orders/[id] (nếu có) | 1208–1290 | 🔧 Lô 1 (kèm) / ⏳ nếu tách route |
| Sản phẩm + form | admin/products + ProductsClient + ProductForm | 1291–1391 | 🔧 Lô 1 |
| Kho và danh mục (5 tab) | categories/suppliers/materials/units/product-tags | 1943–2036 | ⏳ Lô 2 |
| Nhân viên | admin/staff | 1392–1437 | ⏳ Lô 2 |
| Cửa hàng | admin/stores | 1849–1903 | ⏳ Lô 2 |
| Nguồn đơn | admin/integrations (order-sources) | 1904–1942 | ⏳ Lô 2 |
| Khách hàng Viettel (5 tab) | admin/viettel-customers + /customers + /create | 2037–2387 | ⏳ Lô 2 (lớn) |
| Lãi/Lỗ sản phẩm | admin/analytics | 1098–1179 | ⏳ Lô 2 |
| Gán QC ↔ SP | admin/analytics (ad-map) | 1813–1848 | ⏳ Lô 2 |
| Ads Meta | admin/adsmeta, /admin/ads | 1583–1812 | ⏳ Lô 2 (lớn) |
| Voucher | admin/vouchers (+referral/order-vouchers) | 1438–1494 | ⏳ Lô 2 |
| Vòng quay | admin/spin | 2434–… | ⏳ Lô 2 |
| Hoa hồng / Referral | admin/commissions, /referrals, /commission-config | 1495–1559, 2388–2433 | ⏳ Lô 2 |
| Phân hạng (ranks) | admin/ranks | 1560–1582 | ⏳ Lô 2 |
| CSKH (7 tab SMS) | admin/customer-care | 527–1097 | ⏳ Lô 2 (rất lớn) |
| QR / Cửa hàng của tôi / Tích hợp | settings + integrations | rải rác | ⏳ Lô 2 |
| Kết nối (OAuth token vault) | admin/integrations (facebook) | 1180–1207 | ⏳ Lô 2 |
| ~~Tin nhắn~~ | — | 461–526 | ❌ BỎ (đã có cổng CCM riêng) |

Chú thích: 🔧 đang ghép · ⏳ chờ lô sau · ✅ xong · ❌ không ghép.

## ⚠️ Phần THIẾU / cần thiết kế thêm hoặc dùng lại bản cũ (ghi nhớ)

Cập nhật dần theo báo cáo subagent (mục "GAP" = phần thiết kế có nhưng code chưa có handler → giữ template, KHÔNG tự chế wiring):

### Shell
- **⌘K/Ctrl+K command palette** (tìm khách/đơn/SP toàn cục): thiết kế có, code hiện **chưa có** → giữ ô search dạng hình thức, cần build sau (backend search tổng hợp).
- **Chuông thông báo dropdown**: kiểm tra code có `AdminNotifications` chưa; nếu chưa → GAP.

### Lô 1 — GAP thu được (2026-07-06)
- **Dashboard**: **biểu đồ cột doanh thu 7 ngày** (thiết kế 147–161) — code chưa có endpoint chuỗi 7 ngày (`RevenueStats` chỉ trả 1 kỳ). Đã giữ card period hiện có. → cần API `/admin/revenue-stats?series=7d` để wire.
- **Khách hàng**: **thanh lọc** (chip hạng / select khu vực / ô tìm) nằm ở component `CustomerSearch`, và nút **"+ Thêm khách hàng"** ở `CustomerActions` — **ngoài 2 file lô này**, CHƯA restyle → cần reskin bổ sung.
- **Đơn hàng**: **chi tiết đơn** (thiết kế 1208–1290) ở route riêng `/admin/orders/[id]` — chưa reskin (lô sau). Khối **4 stat-card theo trạng thái** (395–403) không thêm (đang dùng `RevenueStats` phong phú hơn — giữ theo ràng buộc).
- **Sản phẩm**: đã reskin `ProductsClient` + `ProductForm` (tsc sạch) nhưng subagent bị **dừng lúc đang verify** → **nên xem lại bằng mắt** ở `/admin/products` để chắc form Thêm/Sửa khớp thiết kế 880px.
- **Shell**: **⌘K command palette** (tìm khách/đơn/SP toàn cục) — ô search render đúng thiết kế nhưng **chỉ hình thức, chưa wire** (chưa có component palette + keybinding + backend search tổng hợp). Nhóm sidebar giữ **click-collapse** (khác prototype tĩnh) để giữ hành vi cũ.

### Lô 2A — GAP thu được (2026-07-06)
- **Chi tiết khách hàng**: mục **"ghi chú"** thiết kế có nhưng **data model chưa có** → không dựng (GAP). Nút "Gửi ZNS" ở header chi tiết là component `CustomerActions` riêng — giữ nguyên.
- **Chi tiết đơn hàng**: nút **"Hủy đơn"** + **"In vận đơn"** thiết kế có nhưng **chưa có handler/endpoint** → chỉ styled nút Xoá (thật). Cần backend hook nếu muốn. Nhiều card Pancake-only (nguồn/kho/thẻ/NV/timeline/hoa hồng) giữ lại (không có trong ref).
- **Kho & danh mục**: đây là **5 route riêng** (categories/suppliers/materials/units/product-tags) chứ không phải 1 màn 5-tab như thiết kế → giữ bảng, **chưa dựng tab-switcher**. `categories/page.tsx` (header/stat/table-header bọc CategoryTree) + `CategoryRowActions.tsx` (modal) **ngoài scope lô này** → chưa reskin.
- **Voucher**: thiết kế bỏ cột "Tên" → theo thiết kế (tên sửa trong modal). Nút kích hoạt trên bảng **đã wire** vào `PATCH /vouchers/:id` (tái dùng endpoint, không thêm mới).
- **Nhân viên**: cột **Vai trò** + **Trạng thái** thiết kế có nhưng `StaffRecord` **chưa có field** → không thêm (GAP).
- **Ranks**: số **"N khách/hạng"** thiết kế có nhưng `/rank-config` **chưa trả** → bỏ (GAP).
- **Nguồn đơn**: `order-sources/page.tsx` chỉ truyền props cho `MasterDataManager` (đã reskin) → không có markup riêng để sửa.

### Lô 2B — GAP thu được (2026-07-06)
- **Hoa hồng**: nút **"Duyệt"** từng dòng + **"Duyệt tất cả"** — code **chưa có handler/endpoint** duyệt hoa hồng (page là server component read-only) → chỉ style ledger. Cần endpoint approve.
- **Vòng quay**: **"Điều kiện tham gia" + "Lưu điều kiện"** chưa có endpoint (controller chỉ có prizes+stats) → render static. Thẻ "Thống kê tháng" (voucher reused, doanh thu) không có nguồn → dùng stats thật (spins/wins/tỷ lệ). Đã thêm inline ±/"Lưu tỉ lệ" (tái dùng `PUT /spin/admin/prizes/:id`).
- **Analytics ad-map**: cột **"Chi tiêu tháng"** chưa có trong `AdMapRow` → không thêm.
- **System QR**: thiết kế "Cấu hình QR" là **VietQR ngân hàng** (bank/account/owner/note) ≠ `qr-config` hiện tại (cấu hình voucher) → giữ nội dung voucher, chỉ áp style. **my-store**: thẻ "Trạng thái" (duyệt/ngày tham gia/số SP) không có data → giữ form thật phong phú hơn.

### Lô 3 — GAP thu được (2026-07-06) — 3 màn khổng lồ
- **Ads Meta**: toggle view "Chiến dịch/Tài khoản QC" trong trang (code dùng **route** `/adsmeta/accall` vs `[accountId]` — giữ route). **BM picker + "Kết nối ⚙"**, **banner token hết hạn + "Làm mới token"**, màn **"Chưa kết nối" OAuth + token vault đa BM**, **switch "Chạy" từng dòng** campaign/adset/ad — đều **chưa có state/endpoint** → không dựng. Swatch funding chỉ trang trí → giữ icon 💳/🎁 thật.
- **Khách hàng Viettel**: 3 tab **operations-report / revenue / pending** vốn là **placeholder chưa nối backend** → reskin dạng placeholder (thiết kế có bảng/card đầy đủ nhưng chưa có fetch/endpoint). Thêm `_ui.tsx` (VtTabs) vì 5 tab là 5 route riêng.
- **CSKH**: **switch bật/tắt** rule tự động/lịch gửi — code **chưa có toggle handler** → hiển thị pill trạng thái thay switch. Màu status `CampaignDetail` là chuỗi thô (không enum) → dùng 1 pill/ngữ cảnh. AutomationForm dùng nhánh skip-order/birthday note thật (khác field note đơn của thiết kế) → giữ nguyên.

## Lộ trình
- **Lô 1** (đang chạy): Shell + Dashboard + Khách hàng + Đơn hàng + Sản phẩm.
- **Lô 2**: các màn ⏳ còn lại, ưu tiên theo tần suất dùng (Kho&danh mục, Voucher, Stores, Nguồn đơn, Ranks → rồi Analytics/Ads/Viettel/CSKH lớn).
- Sau mỗi lô: FE typecheck + xem localhost `/admin`.
