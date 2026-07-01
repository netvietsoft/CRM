# components/ccm — UI kit + nav cho CCM workspace

Dùng bởi các route trong `app/ccm/*`. Xem tổng quan: [`app/ccm/README.md`](../../app/ccm/README.md) · [`docs/09-ccm-workspace.md`](../../../../docs/09-ccm-workspace.md).

## File
- **`CCMTopNav.tsx`** — thanh menu top 5 tab (Hội thoại/Đơn hàng/Bài viết/Thống kê/Cài đặt) + link "← CRM". Active theo `usePathname`.
- **`SubNav.tsx`** — sidebar con dùng cho Thống kê & Cài đặt. Props: `{ title, items: {href,label,icon}[] }`.
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
