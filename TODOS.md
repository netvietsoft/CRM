# 📋 DASHBOARD TIẾN ĐỘ NHIỆM VỤ (TODOS.md)

> **CẢNH BÁO**: File này được sinh tự động bởi `python scripts/update-todos.py` từ nguồn sự thật `.ai/tasks/`.
> **CẤM SỬA TAY FILE NÀY**. Thay đổi trạng thái bằng cách di chuyển file YAML giữa các thư mục trạng thái.
> **Cập nhật lần cuối**: `2026-10-28 21:51:47`

## 📊 TỔNG QUAN TIẾN ĐỘ

**Tiến độ dự án**: `[██████████████████████░░░] 88.9%` (8/9 tasks hoàn thành)

| Trạng thái | Thư mục nguồn | Số lượng |
|---|---|:---:|
| 📥 **Backlog** | `.ai/tasks/backlog/` | 0 |
| 🟢 **Ready** | `.ai/tasks/ready/` | 0 |
| ⚡ **Running** | `.ai/tasks/running/` | 0 |
| 🔍 **Review** | `.ai/tasks/review/` | 1 |
| 🛑 **Blocked** | `.ai/tasks/blocked/` | 0 |
| ✅ **Done** | `.ai/tasks/done/` | 8 |

## ⚡ ĐANG THỰC HIỆN (RUNNING) (0)

_Không có nhiệm vụ nào._

## 🔍 CHỜ REVIEW & QUALITY GATE (REVIEW) (1)

| ID | Tiêu đề nhiệm vụ | Phân loại | Ưu tiên | Người phụ trách | File cấu hình |
|:---|:---|:---:|:---:|:---:|:---|
| **TASK-008** | SEC-08: Ràng buộc tenant cho chữ ký HMAC Webhook Pancake — định tuyến theo integration đã xác thực, chặn IDOR ghi xuyên Store | `security` | **MEDIUM** | `claude-code` | [`.ai/tasks/review/TASK-008-sec-pancake-webhook-tenant-binding.yaml`](file:///D:/SetupC/WWW/crm/.ai/tasks/review/TASK-008-sec-pancake-webhook-tenant-binding.yaml) |

## 🟢 SẴN SÀNG NHẬN (READY) (0)

_Không có nhiệm vụ nào._

## 🛑 BỊ KẸT (BLOCKED) (0)

_Không có nhiệm vụ nào._

## 📥 HÀNG ĐỢI (BACKLOG) (0)

_Không có nhiệm vụ nào._

## ✅ ĐÃ HOÀN THÀNH (DONE) (8)

| ID | Tiêu đề nhiệm vụ | Phân loại | Ưu tiên | Người phụ trách | File cấu hình |
|:---|:---|:---:|:---:|:---:|:---|
| **TASK-001** | SEC-01: Bổ sung xác thực chữ ký HMAC-SHA256 cho Webhook Pancake | `security` | **CRITICAL** | `antigravity` | [`.ai/tasks/done/TASK-001-sec-pancake-webhook-hmac.yaml`](file:///D:/SetupC/WWW/crm/.ai/tasks/done/TASK-001-sec-pancake-webhook-hmac.yaml) |
| **TASK-002** | SEC-02: Gỡ bỏ .env.prod khỏi Git tracking và xoay vòng toàn bộ Production Secrets | `security` | **CRITICAL** | `antigravity` | [`.ai/tasks/done/TASK-002-sec-env-prod-rotation.yaml`](file:///D:/SetupC/WWW/crm/.ai/tasks/done/TASK-002-sec-env-prod-rotation.yaml) |
| **TASK-003** | BIZ-01: Bọc Prisma $transaction cho OrdersService.createAdminOrder đảm bảo toàn vẹn tồn kho | `business_logic` | **CRITICAL** | `antigravity` | [`.ai/tasks/done/TASK-003-biz-admin-order-transaction.yaml`](file:///D:/SetupC/WWW/crm/.ai/tasks/done/TASK-003-biz-admin-order-transaction.yaml) |
| **TASK-004** | FE-01: Khắc phục vòng lặp gọi API vô tận trong custom hook useApi bằng useRef | `frontend` | **CRITICAL** | `antigravity` | [`.ai/tasks/done/TASK-004-fe-useapi-infinite-loop.yaml`](file:///D:/SetupC/WWW/crm/.ai/tasks/done/TASK-004-fe-useapi-infinite-loop.yaml) |
| **TASK-005** | BIZ-02: Sửa luồng áp dụng Voucher Checkout, ngăn chặn tự tạo mới UserVoucher khi bị REJECTED | `business_logic` | **HIGH** | `antigravity` | [`.ai/tasks/done/TASK-005-biz-voucher-checkout-lifecycle.yaml`](file:///D:/SetupC/WWW/crm/.ai/tasks/done/TASK-005-biz-voucher-checkout-lifecycle.yaml) |
| **TASK-006** | SEC-03: Tách riêng Secret giữa Access Token và Refresh Token, bổ sung kiểm tra token type | `security` | **HIGH** | `antigravity` | [`.ai/tasks/done/TASK-006-sec-jwt-secret-split.yaml`](file:///D:/SetupC/WWW/crm/.ai/tasks/done/TASK-006-sec-jwt-secret-split.yaml) |
| **TASK-007** | FEAT: Tích hợp đồng bộ sản phẩm trực tiếp lên Meta Commerce Catalog (catalog_management) | `feature` | **HIGH** | `antigravity` | [`.ai/tasks/done/TASK-007-meta-commerce-catalog-sync.yaml`](file:///D:/SetupC/WWW/crm/.ai/tasks/done/TASK-007-meta-commerce-catalog-sync.yaml) |
| **TASK-009** | FEAT: Tích hợp & Kiểm thử E2E Playwright 6 Quyền Meta App Review (pages_utility_messaging, paid_marketing_messages, marketing_messages_messenger, pages_messaging, catalog_management, ads_read) | `feature` | **HIGH** | `antigravity` | [`.ai/tasks/done/TASK-009-meta-utility-messaging-templates.yaml`](file:///D:/SetupC/WWW/crm/.ai/tasks/done/TASK-009-meta-utility-messaging-templates.yaml) |
