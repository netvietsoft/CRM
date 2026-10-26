# 📊 BẢNG ĐIỀU KHIỂN & ĐỒNG BỘ META ADS (docs/Architecture/ads.md)

> Bảng điều khiển hiệu suất quảng cáo Meta Ads: `/admin/adsmeta/[accountId]` và `/admin/adsmeta/accall`.

---

## 1. Giao diện Dashboard KPI & Bảng Chiến dịch
- **Dashboard KPI**: Hiển thị lưới chỉ số tổng hợp: Chi tiêu (`Spend`), Kết quả (`Results`), Tổng giá trị mua (`Purchase Value`), ROAS trung bình, % Chi phí quảng cáo (`% Ads Cost`), Giá/Kết quả, Lượt hiển thị, Lượt click, CTR.
  - Cho phép kéo-thả sắp xếp thứ tự và ẩn/hiện chỉ số (lưu cấu hình vào `localStorage`).
- **Bộ lọc thời gian**: Các nút chọn nhanh (Hôm nay, Hôm qua, Tuần này, Tuần trước, Tháng này, Quý này, Tất cả).
- **Bảng Chiến dịch Drill-Down 3 cấp**:
  - Cấp 1: Chiến dịch (`Campaign`).
  - Cấp 2: Nhóm quảng cáo (`Ad Set`) - Xổ ra khi bấm vào biểu tượng ▶ dòng chiến dịch.
  - Cấp 3: Bài quảng cáo (`Ad`) - Xổ ra khi bấm tiếp vào nhóm quảng cáo.
- **Cột Động (Meta Action Types)**: Tự động phát hiện các chỉ số hành động từ Meta (Lượt bắt đầu tin nhắn, Lượt thêm giỏ, Lượt xem video...) và sinh cột tương ứng.

---

## 2. API Backend Phục vụ Dashboard (`src/integrations/ads`)
- `GET /api/ads/summary?from=&to=&accountId=`: Thống kê KPI tổng hợp.
- `GET /api/ads/campaigns?from=&to=&accountId=`: Danh sách chiến dịch kèm chỉ số cộng dồn.
- `GET /api/ads/campaigns/:id/adsets`: Danh sách nhóm quảng cáo thuộc chiến dịch.
- `GET /api/ads/adsets/:id/ads`: Danh sách bài quảng cáo thuộc nhóm quảng cáo.
- `POST /api/ads/sync`: Kích hoạt đồng bộ dữ liệu mới nhất từ Meta Graph API (chạy qua BullMQ hoặc inline).

