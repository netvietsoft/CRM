# ⚖️ ARCHITECTURE DECISION RECORDS (ADR) (docs/ADR/README.md)

> Thư mục lưu trữ các quyết định kiến trúc quan trọng theo chuẩn **Development Workspace Standard v1.1 (§18)**.

---

## 1. Mục đích
Khi một quyết định thay đổi kiến trúc lớn, công nghệ, thư viện lõi hoặc cơ chế dữ liệu được đưa ra, bắt buộc phải tạo 1 bản ghi ADR để:
- Lưu lại bối cảnh (Context).
- Lý do chọn giải pháp này (Decision & Rationale).
- Các phương án đã bị từ chối và lý do (Rejected Alternatives).
- Tác động tới hệ thống và các bước triển khai tiếp theo (Consequences & Impact).

---

## 2. Danh mục Quyết định Kiến trúc Hiện có

| Mã ADR | Tiêu đề | Trạng thái | Ngày quyết định |
|---|---|:---:|:---:|
| [ADR-001](file:///d:/SetupC/WWW/crm/docs/ADR/ADR-001-nestjs-backend.md) | Sử dụng NestJS làm nền tảng Backend API | **ACCEPTED** | 2026-06-01 |
| [ADR-002](file:///d:/SetupC/WWW/crm/docs/ADR/ADR-002-nextjs-app-router.md) | Sử dụng Next.js 16 App Router cho Frontend Portal & Admin | **ACCEPTED** | 2026-06-01 |
| [ADR-003](file:///d:/SetupC/WWW/crm/docs/ADR/ADR-003-prisma-mysql.md) | Sử dụng Prisma ORM và Cơ sở Dữ liệu MySQL 8.0 | **ACCEPTED** | 2026-06-01 |
| [ADR-004](file:///d:/SetupC/WWW/crm/docs/ADR/ADR-004-bullmq-redis.md) | Sử dụng BullMQ & Redis cho Hàng đợi Xử lý Tác vụ Nền | **ACCEPTED** | 2026-06-15 |

