# 🎨 BRIEF BỔ SUNG THIẾT KẾ — CRM netvietsoft + Cổng CCM

> Dùng cho phiên **Claude design** tiếp theo. Gói handoff hiện có (`Newdesign/CRM design implementation.zip` → `design_handoff_crm_ccm/`) phủ tốt phần **khung** nhưng **thiếu 4 màn lớn của CRM**, **thiếu chiều sâu (sub-UI + trạng thái) của cổng CCM**, và **thiếu loạt trạng thái xuyên suốt** (loading/empty/error/permission…).
> **Yêu cầu bắt buộc:** tái dùng **nguyên** design tokens trong `README.md` của gói (màu, Inter/JetBrains Mono, radius, spacing, shadow, switch 44×25, rail 54px, list 318px, panel 300px). Không tự chế palette mới. Icon dùng lucide-style stroke như `icons.md`.

---

## PHẦN 1 — Màn CRM admin CÒN THIẾU (có trong code, không có trong screen-map)

Các route này đã chạy thật nhưng gói design **chưa vẽ**. Cần thiết kế mới, cùng shell (`AdminSidebar` nhóm + topbar ⌘K/chuông/avatar).

### 1.1 Phân tích Lãi/Lỗ (`/admin/analytics`)
- **Mục đích:** báo cáo lãi/lỗ theo **sản phẩm** + màn **gán chi phí quảng cáo** vào sản phẩm/đơn.
- **Dữ liệu chính:** doanh thu – giá vốn (giá sản xuất) – phí ship – phí quảng cáo phân bổ = lãi/lỗ ròng; lọc theo kỳ (hôm nay/tuần/tháng/quý/tùy chọn).
- **Cần vẽ:** bảng P&L theo SP (cột: SP, số bán, doanh thu, giá vốn, phí QC, lãi ròng, biên %); màn "gán quảng cáo" (kéo chi phí campaign → nhóm SP); card tổng lãi/lỗ đầu trang; cảnh báo SP **thiếu giá sản xuất** (⚠ vàng).
- **Trạng thái:** loading skeleton bảng, empty ("chưa có dữ liệu kỳ này"), SP lỗ (đỏ) vs lãi (xanh).

### 1.2 Meta Ads Dashboard (`/admin/adsmeta`, `/admin/ads`)
- **Mục đích:** theo dõi hiệu quả quảng cáo Meta (nhiều tài khoản / Business Manager).
- **Dữ liệu chính:** spend, impressions, clicks, CTR, CPC, CPM, results, cost/result; theo campaign/adset/ad; lọc kỳ nhanh (Hôm nay…Quý này); nhiều tài khoản QC + Fanpage.
- **Cần vẽ:** KPI cards có thể **bật/tắt + kéo–thả + chọn số cột** (feature đã có, cần layout chuẩn); bảng campaign phân cấp; **menu thao tác dòng ⋯** (Sao chép ID / Mở Ads Manager); bộ chọn tài khoản QC + Business Manager; màn "Kết nối" (OAuth Facebook, đa BM, token vault).
- **Trạng thái:** chưa kết nối (CTA "Kết nối Facebook"), token hết hạn (badge cảnh báo + nút refresh), đang tải số liệu.

### 1.3 Hoa hồng & Giới thiệu (`/admin/commissions`, `/referrals`, `/referral-vouchers`, `/order-vouchers`, `/commission-config`)
- **Mục đích:** hệ affiliate/CTV — sổ hoa hồng, cây giới thiệu, cấu hình tỉ lệ, voucher giới thiệu.
- **Dữ liệu chính:** `CommissionLedger` (đơn → hoa hồng, trạng thái trả), số dư `commissionBalance`, cây referral (ancestor/descendant), ngưỡng/tỉ lệ theo hạng.
- **Cần vẽ:** bảng sổ hoa hồng (đơn, người nhận, mức, trạng thái: chờ/đã trả/đảo); màn cấu hình tỉ lệ hoa hồng theo hạng; cây giới thiệu (tree/collapse); voucher giới thiệu vs voucher đơn (2 loại) — hiện design chỉ có "Voucher" chung.
- **Trạng thái:** hoa hồng bị **đảo** khi đơn hoàn (badge riêng), số dư âm/đang chờ.

### 1.4 Vận đơn Viettel Post (`/admin/viettel-customers`, `/viettel-customers/customers`, `/create`)
- **Mục đích:** quản lý vận đơn VTP — danh sách vận đơn, khách VTP, tạo vận đơn (kể cả bản nháp DRAFT).
- **Dữ liệu chính:** vận đơn (mã, người nhận, địa chỉ 3 cấp / "địa danh mới" 2 cấp, COD, cước, trạng thái giao LIVE), liên kết `orderReference = orderCode`.
- **Cần vẽ:** bảng vận đơn + lọc trạng thái + **chân trang phân trang** (chọn 10/20/50/100/200, mặc định 50) + nút **Xuất Excel ⬇** ở thẻ "Số khách"; form tạo vận đơn (dropdown tỉnh/huyện/xã + toggle "địa danh mới", tra cước, COD tự bám tổng, ghi chú mặc định, mã đơn tự sinh); badge **📝 Nháp** cho `DRAFT-`; modal "Sửa KH".
- **Trạng thái:** trạng thái giao theo màu (chấm đỏ/xanh), nháp vs đã đẩy, lỗi tra cước.

> **Ghi chú:** `messenger` (embed) đã có trong design ("Tin nhắn"). `product-tags`, `colors`, `sizes` gộp vào "Danh mục dữ liệu" là đủ.

---

## PHẦN 2 — Cổng CCM: màn đã có nhưng THIẾU chiều sâu (sub-UI + trạng thái)

Screen-map liệt kê đủ route CCM, nhưng các **sub-UI phức tạp** và **trạng thái thật** chưa được vẽ. Đây là phần khác biệt lớn nhất giữa prototype và sản phẩm.

### 2.1 Dialog **Đẩy Viettel Post** (từ đơn CCM/Đơn hàng) — CHƯA có
Prototype chỉ ghi "PENDING → đẩy VTP". Thực tế là 1 dialog nhiều bước:
- Chọn **tỉnh/huyện/xã VTP** (dropdown phụ thuộc, có toggle "địa danh mới" 2 cấp) → **tra cước** (chọn dịch vụ) → **đẩy** → ghi mã vận đơn về đơn.
- **Cần vẽ:** dialog full (địa chỉ, bảng dịch vụ + giá, COD, tổng cước, nút Đẩy), trạng thái loading tra cước, lỗi địa chỉ, thành công (hiện mã vận đơn + badge VTP trên thẻ đơn).

### 2.2 Thẻ đơn (OrderCard) trong panel + **trạng thái giao LIVE** — thiếu chi tiết
- Thẻ đơn kiểu Pancake: mã đơn, **luồng trạng thái** (stepper), người nhận/địa chỉ, SP, tổng, giờ, ghi chú, badge **VTP + mã vận đơn**, chip thẻ đơn/thẻ KH.
- **Trạng thái giao LIVE** từ VTP (statusName + chấm màu). Cần vẽ stepper trạng thái + trạng thái **hoàn hàng (RETURNING)** (audit: đây là case chưa xử lý).

### 2.3 AI chốt đơn — trạng thái **trong khung chat** (không chỉ tab cài đặt)
Prototype có tab cài đặt `ai` (off/shadow/auto). Thiếu UI vận hành trong chat:
- **Thẻ "Gợi ý AI (shadow)"** trên composer: nội dung AI soạn + nút **Gửi / Sửa / Bỏ**.
- Nút **🤖⏸ Tiếp quản** (người nhận lại, tạm dừng AI hội thoại).
- Badge trạng thái AI hội thoại: **ACTIVE / HANDOFF / PAUSED**; nhãn **"AI lỗi"** khi orchestrate fail.
- **Cần vẽ:** cả 3 trạng thái + micro-copy + vị trí trong thread/composer.

### 2.4 Ngôi sao ưu tiên **4 trạng thái** — prototype chỉ 1
Thực tế xoay **trắng → vàng → xanh → đỏ → tắt** (25px, trắng opacity 50%) trên avatar list **và** avatar 3A. Cần bảng màu + hành vi click từng bước.

### 2.5 **Sinh nhật khách (🎂)** trên header 3A — CHƯA có
Icon 🎂 → mở **date-picker** (dd/mm/yyyy) → lưu ngày sinh khách (đồng bộ hồ sơ). Cần vẽ popover date-picker + trạng thái đã có/chưa có sinh nhật.

### 2.6 **Trả lời nhanh** — editor đa nội dung (prototype chỉ 1 dòng text)
Thực tế: **chủ đề → phím tắt → nhiều khối nội dung** (text/ảnh/file/emoji/**sản phẩm**/**biến `#{...}`**), có ô search chủ đề; khi gửi resolve biến (tên khách/NV/ngày, spin `#{a|b}`, `#SEX{}`). Cần vẽ màn quản lý mẫu (Cài đặt) + popup ⚡ trong composer + chip biến.

### 2.7 **Thư viện ảnh/media dùng chung (R2)** — CHƯA có
Nút 🖼️ mở popup thư viện: upload nhiều ảnh (lên R2), tab "Gần đây/Yêu thích", chọn nhiều (badge số), gửi. Cần vẽ popup grid + trạng thái upload/lỗi/empty.

### 2.8 **Rail lọc** đầy đủ — prototype chỉ all/unread/star/spam
Thực tế còn: **AI**, **có SĐT / chưa SĐT**, **chưa trả lời**, **lọc theo ngày (popup Từ–Đến + nội dung)**, **theo nguồn**, **theo nhân viên**. Cần vẽ đủ icon rail 54px + popup lọc ngày (3 ô chữ đen) + popup chọn nhân viên/nguồn.

### 2.9 Header thread (FRAME 3A) — chuẩn hoá icon thật
Đã thay 16 SVG Pancake; cần bản thiết kế chốt vị trí: avatar+tên+👁 phụ trách+📞+nhãn, hàng icon 🔗 chia sẻ / giới tính / 🎂 / phân công (popup chọn NV) / toggle panel. Kèm tooltip mọi icon.

---

## PHẦN 3 — Trạng thái & luồng XUYÊN SUỐT còn thiếu (áp cho MỌI màn)

Prototype dùng `showToast()` cho mọi hành động → thiếu hẳn các trạng thái sản phẩm thật. Cần thiết kế **bộ trạng thái chuẩn** dùng lại toàn hệ:

1. **Loading** — skeleton cho bảng/card/thread (không chỉ spinner).
2. **Empty** — mỗi bảng/list có empty state riêng (icon + câu gợi ý + CTA).
3. **Error** — lỗi tải / lỗi lưu (banner đỏ + retry); phân biệt **401 hết phiên** (→ re-login) vs **403 thiếu quyền** (→ "Bạn không có quyền").
4. **Validation** — trạng thái lỗi field trong form (tạo đơn: thiếu SP/SĐT; tạo vận đơn: thiếu địa chỉ).
5. **Confirm dialog** — hành động phá huỷ: **Huỷ đơn, Hoàn hàng, Xoá khách/SP/thẻ** (audit: xoá khách hiện cascade — UI cần cảnh báo rõ hệ quả).
6. **Toast thật** — success/error/info (thay mọi `showToast` mô tả) + vị trí + thời lượng.
7. **Phân trang** — chân bảng chuẩn (số bản ghi, chọn page-size 10/20/50/100/200, trước/sau) — hiện chỉ 1 bảng có.
8. **Phân quyền theo vai trò** — ma trận `perm[role][12]` đã có, nhưng **thiếu quy tắc ẩn/mờ nút & màn theo quyền**: mô tả rõ role nào thấy gì (VD STAFF không thấy nút Xoá, MODERATOR không thấy Cửa hàng khác). Cần "permission-gated" spec cho từng nút nhạy cảm.
9. **Chuyển cửa hàng (store switcher)** — hệ đa tenant (`effectiveStoreId`): ADMIN chuyển store. Prototype chưa có control này ở topbar — cần vẽ.
10. **Responsive** — gói hiện desktop-only. Cần breakpoint tablet (thu panel phải/rail CCM) và ứng xử mobile (ít nhất list ↔ thread điều hướng).
11. **Focus/keyboard/A11y** — trạng thái focus ring, ESC đóng popup (đã có), Enter gửi (đã có); bổ sung focus order + ARIA cho form/dialog.

---

## PHẦN 4 — Ưu tiên đề xuất cho phiên design
1. **PHẦN 3** (bộ trạng thái chuẩn) trước — vì mọi màn khác tái dùng.
2. **PHẦN 2** CCM chiều sâu (VTP dialog, AI-in-chat, media, quick-reply, star 4 trạng thái, rail đầy đủ) — đây là khác biệt lớn nhất so với prototype.
3. **PHẦN 1** 4 màn CRM mới (Analytics → Ads → Hoa hồng → Vận đơn VTP).

> Mọi màn mới phải kèm: layout desktop (pixel theo tokens) + 3 trạng thái tối thiểu (loading/empty/error) + bản mô tả dữ liệu/hành động để ghép API. Xuất cùng định dạng `.dc.html` như gói gốc để đồng bộ handoff.
