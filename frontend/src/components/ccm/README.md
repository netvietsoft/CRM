# components/ccm — UI kit + nav cho CCM workspace

Dùng bởi các route trong `app/ccm/*`. Xem tổng quan: [`app/ccm/README.md`](../../app/ccm/README.md) · [`docs/09-ccm-workspace.md`](../../../../docs/09-ccm-workspace.md).

## File
- **`CcmTopNav.tsx`** — thanh menu top 5 tab (Hội thoại/Đơn hàng/Bài viết/Thống kê/Cài đặt) + link "← CRM". Active theo `usePathname`.
- **`SubNav.tsx`** — sidebar con dùng cho Thống kê & Cài đặt. Props: `{ title, items: {href,label,icon}[] }`.
- **`CcmConversations.tsx`** — CCM Chat **thật** (nối `/api/messenger/*` qua hook `src/lib/useMessengerChat.ts`). Cấu trúc xem mục dưới.
- **`CcmCustomerPanel.tsx`** — [CỘT 4] panel phải: tab **Thông tin** (đơn THẬT của khách theo SĐT — `GET /orders/admin?search=<phone>`) & **Tạo đơn** (form THẬT: picker `GET /products/search` + `POST /orders/admin`). Mỗi đơn có nút 🚚 **Đẩy VTP**. Bật/tắt panel bằng nút ▤ ở header chat.
- **`CcmViettelPushDialog.tsx`** — modal đẩy 1 đơn CRM sang **Viettel Post**: chọn tỉnh/huyện/xã VTP (`/viettelpost/address/*`, có toggle "Địa danh mới"), tra cước (`POST /viettelpost/price`), đẩy (`POST /viettelpost/orders`). Liên kết CRM↔VTP qua `orderReference = orderCode`. Dùng ở `/ccm/orders` và OrderCard trong panel.
- **`CcmImagePicker.tsx`** — popup "Thư mục ảnh" (nút 🖼️ composer): upload nhiều ảnh qua **UploadThing** (`productImage`); "Tải lên gần đây"/"Yêu thích" lưu localStorage; chọn nhiều (badge số) → `onSend(urls)` → chat gửi từng ảnh qua `reply({attachmentUrl})`.

## Store & tiện ích (ở `src/lib/`)
- **`useCcmSettings.ts`** — store dùng chung (localStorage + pub/sub) nối **Cài đặt ↔ Chat**: `quickReplies` (composer ⚡), `tags` (picker 🏷️ + màu chip), `prefs` (giao diện list). `getPrefs()` = đọc non-hook (dùng trong handler realtime). Sửa danh mục ở `app/ccm/settings/{quick-reply,tags,interface,page}`.
- **`ccmSounds.ts`** — âm thông báo tổng hợp Web Audio (6 âm), `playSound(id)`; dùng ở Cài đặt chung (nghe thử) + `useMessengerChat` (phát khi có tin realtime).
- **`ui.tsx`** — UI kit (client components), tất cả **thuần trình bày**:
  | Export | Công dụng |
  |---|---|
  | `Card` | khung có title/subtitle/right |
  | `StatCard` | thẻ KPI (icon/label/value/delta) |
  | `Sparkline` / `MockChart` / `Donut` | biểu đồ **SVG tự vẽ** (mock, không cần data thật) |
  | `Toggle` / `Pill` | switch + badge màu |
  | `MockTable` | bảng từ `headers[]` + `rows[][]` |
  | `SettingSection` / `SettingRow` | khối cài đặt (label + desc + control) |
  | `MockBadge` | nhãn `template · mock` |

## Nguyên tắc
- KHÔNG gọi API trong ui.tsx — chỉ nhận props/hằng số. Data thật sẽ truyền từ page khi ghép logic.
- Biểu đồ vẽ bằng `<svg>` nội tuyến (tránh thư viện ngoài + CSP).
- Khi cần component mới cho nhiều màn → thêm vào `ui.tsx` để tái dùng.

## Cấu trúc `CcmConversations.tsx` (bản đồ để sửa)
3 cột; các tên frame khớp comment trong file (search nhanh trong code):

| Vùng | Tên (comment) | Nội dung / chỗ sửa |
|---|---|---|
| **Cột 1** | `[CỘT 1] ICON RAIL` | thanh **LỌC** dọc trái (mảng `RAIL`): 💬 Tất cả · 💭 Chưa đọc · ✉️ Lọc tin nhắn(AI·template) · ★ Quan trọng(template) · 📞 Có SĐT · 📵 Không SĐT · 🕐 Chưa trả lời(+sort) · 📅 Theo ngày(template) · 🗂️ Nguồn(template) · 👥 Lọc nhân viên. Lọc client-side qua `visibleConversations` (state `railFilter`/`staffFilter`/`unansweredSort`) |
| **Cột 2** | `[CỘT 2] LIST HỘI THOẠI` | rộng `w-[330px]` |
| ▸ 2A | `FRAME 2A: TOOLBAR` | ô tìm kiếm + chọn page + nút ＋Page/⟳ |
| ▸ 2B | `FRAME 2B: CONV-LIST` | danh sách; mỗi dòng = `ConversationRow` |
| ▸ 2B·A | `[A] AVATAR` | avatar khách + badge chưa đọc |
| ▸ 2B·B | `[B] HÀNG-TÊN` | tên khách · 📞 SĐT · giờ tin cuối |
| ▸ 2B·C | `[C] HÀNG-PREVIEW` | icon chiều tin (📩/↩) + trích tin cuối |
| ▸ 2B·D | `[D] HÀNG-META` | chip nhân viên (avatar+tên) + chip nhãn |
| ▸ 2C | `FRAME 2C: FLASH` | dòng thông báo thao tác |
| **Cột 3** | `[CỘT 3] KHU CHAT` | co giãn |
| ▸ 3A | `FRAME 3A: CHAT-HEADER` | **Trái** `[3A-L]`: avatar + tên + 👁 phụ trách + 📞 + nhãn; hàng icon nhỏ 🔗 Link · 🕐 Lịch sử · 👤 Giới tính · 🎂 Ngày sinh. **Phải** `[3A-R]` 4 icon (trái→phải): 👤⁺ **Phân công NV** (dropdown chọn NV thật) · ☷ **Tất cả HT của khách** (lọc list theo tên/psid) · 🏷️ **Nhãn** · ▭ **Thông tin** (bật/tắt Cột 4) |
| ▸ 3B | `FRAME 3B: THREAD` | bong bóng tin (OUT phải xanh / IN trái trắng) |
| ▸ 3C | `FRAME 3C: COMPOSER` | nút ảnh + ô nhập + nút Gửi |
| **Cột 4** | `[CỘT 4] PANEL KHÁCH / ĐƠN HÀNG` | `CcmCustomerPanel.tsx`, rộng 360px, bật/tắt bằng nút ▤ |
| ▸ 4A | `FRAME 4A: GHI CHÚ` | tên/SĐT khách (thật, từ hội thoại) |
| ▸ 4B | `FRAME 4B: DANH SÁCH ĐƠN` | `OrderCard` THẬT — `GET /orders/admin?search=<phone>`; mỗi thẻ có nút 🚚 Đẩy VTP |
| ▸ 4C | `FRAME 4C: FORM TẠO ĐƠN` | form THẬT: picker SP + thanh toán + `POST /orders/admin`; prefill tên/SĐT khách |

**Resize cột**: kéo 2 divider (`startDrag('list')` giữa Cột 2↔3, `startDrag('panel')` giữa Cột 3↔4). Cột 2/4 rộng động (`listW`/`panelW`, lưu localStorage `ccm.cols.v1`, clamp 240–560 / 280–600); Cột 3 tự co giãn (`flex-1`). Đổi min/max ở hàm `startDrag`.
**Màu hover / dòng đang chọn** danh sách: sửa hàm **`rowCls`** + hằng **`ROW_BASE`** (đầu file). Hiện tại: hover = `bg-blue-100/70`, đang chọn = `bg-blue-100` + thanh nhấn trái `border-l-[#3b5bdb]`.
**Avatar/DirIcon**: component `Avatar` (ảnh/chữ cái đầu) + `DirIcon` (📩 đến / ↩ rep) — đầu file.
**Cột dữ liệu** (kiểu `Conversation`): định nghĩa trong hook `src/lib/useMessengerChat.ts` — `contact.{name,phone,avatarUrl,psid}`, `assignedUserName/assignedUserAvatar`, `labels`, `lastMessageText/At/Dir`, `unreadCount`.
