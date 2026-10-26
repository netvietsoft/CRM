# 📋 SỔ NHẬT KÝ QUYẾT ĐỊNH (docs/Decisions/decision-log.md)

> Ghi nhận các quyết định thiết kế kỹ thuật, sửa đổi cấu trúc và thỏa hiệp nghiệp vụ.

---

## 1. Nhật ký Quyết định

| Ngày | Quyết định | Bối cảnh / Lý do | Người quyết định | Trạng thái |
|:---:|---|---|:---:|:---:|
| **2026-08-28** | Tái cấu trúc Workspace theo chuẩn Development Workspace Standard v1.1 | Thiết lập hệ thống AI Agent đa vai trò, quản lý Task bằng YAML, tự động sinh `TODOS.md` | User + Agent | **COMPLETED** |
| **2026-08-28** | Di chuyển toàn bộ tài liệu cũ sang `docs/Architecture/` và các thư mục chuẩn hóa | Tập trung hóa tài liệu kỹ thuật, loại bỏ trùng lặp và phân tán | User + Agent | **COMPLETED** |
| **2026-07-08** | Vòng đời Voucher theo đơn hàng (`ApprovalMode` AUTO/MANUAL) | Tự động kích hoạt khi đơn giao thành công và COD >= 100k | Product Owner | **ACCEPTED** |
| **2026-07-07** | Chuyển toàn bộ tải ảnh sang Cloudflare R2 | Khắc phục sự cố UploadThing hết token và tự chủ hạ tầng lưu trữ | Dev Team | **ACCEPTED** |
| **2026-06-30** | Mô hình Phân tích PnL sản phẩm theo thời gian thực (`AdProductMap`) | Tự động tính toán lãi/lỗ dựa trên doanh thu đơn COD trừ chi phí quảng cáo Meta Ads | Product Owner | **ACCEPTED** |

