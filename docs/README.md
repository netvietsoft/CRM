# 📚 MỤC LỤC TÀI LIỆU DỰ ÁN CRM (docs/README.md)

> Toàn bộ tài liệu kỹ thuật, kiến trúc và vận hành của hệ thống CRM Netvietsoft được tổ chức khoa học theo các chuyên mục dưới đây.

---

## 📑 DANH MỤC TÀI LIỆU

### 1. 📜 Quy chuẩn & Cấu trúc
- [docs/rules.md](file:///d:/SetupC/WWW/crm/docs/rules.md): Quy tắc lập trình chung, tiêu chuẩn Backend/Frontend, quy chuẩn database và an toàn tiền tệ.
- [docs/CAU_TRUC_THU_MUC.md](file:///d:/SetupC/WWW/crm/docs/CAU_TRUC_THU_MUC.md): Sơ đồ giải thích toàn bộ cây thư mục dự án.

### 2. 🏗️ Kiến trúc Hệ thống (`docs/Architecture/`)
- [Architecture/overview.md](file:///d:/SetupC/WWW/crm/docs/Architecture/overview.md): Tổng quan kiến trúc hệ thống, phân quyền, luồng request.
- [Architecture/backend.md](file:///d:/SetupC/WWW/crm/docs/Architecture/backend.md): Chi tiết tất cả module Backend, DTO, Service và REST Endpoints.
- [Architecture/frontend.md](file:///d:/SetupC/WWW/crm/docs/Architecture/frontend.md): Bản đồ router Next.js, phân loại Component và cơ chế State.
- [Architecture/database.md](file:///d:/SetupC/WWW/crm/docs/Architecture/database.md): 60+ Model Prisma, quan hệ Closure Table, Enums.
- [Architecture/integrations.md](file:///d:/SetupC/WWW/crm/docs/Architecture/integrations.md): Tích hợp Pancake, ViettelPost, Casso VietQR, Meta Ads, Facebook OAuth.
- [Architecture/messaging-customer-care.md](file:///d:/SetupC/WWW/crm/docs/Architecture/messaging-customer-care.md): Hệ thống CSKH đa kênh, template, chiến dịch.
- [Architecture/ads.md](file:///d:/SetupC/WWW/crm/docs/Architecture/ads.md): Giao diện và API đồng bộ dữ liệu Meta Ads.
- [Architecture/ccm-workspace.md](file:///d:/SetupC/WWW/crm/docs/Architecture/ccm-workspace.md): Không gian làm việc CCM và Messenger Live Chat.
- [Architecture/voucher-system.md](file:///d:/SetupC/WWW/crm/docs/Architecture/voucher-system.md): Sơ đồ luồng trạng thái Voucher, QR Claim và Gamification.
- [Architecture/deployment.md](file:///d:/SetupC/WWW/crm/docs/Architecture/deployment.md): Kiến trúc môi trường Production, Nginx, PM2, Docker.

### 3. 📑 Hợp đồng & Đặc tả Giao tiếp (`docs/Contracts/`)
- [Contracts/viettelpost-api-spec.md](file:///d:/SetupC/WWW/crm/docs/Contracts/viettelpost-api-spec.md): Đặc tả API ViettelPost Partner v2.
- [Contracts/database-schema.md](file:///d:/SetupC/WWW/crm/docs/Contracts/database-schema.md): Đặc tả schema DB và các quy ước ràng buộc khóa ngoại.
- [Contracts/error-codes.md](file:///d:/SetupC/WWW/crm/docs/Contracts/error-codes.md): Bảng mã lỗi HTTP và mã lỗi nghiệp vụ chuẩn.
- [Contracts/events.md](file:///d:/SetupC/WWW/crm/docs/Contracts/events.md): Danh mục sự kiện nội bộ và Webhook events.

### 4. ⚖️ Quyết định Kiến trúc (`docs/ADR/`)
- [ADR/README.md](file:///d:/SetupC/WWW/crm/docs/ADR/README.md): Hướng dẫn viết Architecture Decision Records.
- [ADR/ADR-001-nestjs-backend.md](file:///d:/SetupC/WWW/crm/docs/ADR/ADR-001-nestjs-backend.md): Lựa chọn NestJS cho Backend.
- [ADR/ADR-002-nextjs-app-router.md](file:///d:/SetupC/WWW/crm/docs/ADR/ADR-002-nextjs-app-router.md): Lựa chọn Next.js App Router cho Frontend.
- [ADR/ADR-003-prisma-mysql.md](file:///d:/SetupC/WWW/crm/docs/ADR/ADR-003-prisma-mysql.md): Lựa chọn Prisma ORM & MySQL 8.
- [ADR/ADR-004-bullmq-redis.md](file:///d:/SetupC/WWW/crm/docs/ADR/ADR-004-bullmq-redis.md): Lựa chọn Redis & BullMQ cho xử lý hàng đợi nền.

### 5. 👥 AI Agents & Phân quyền (`docs/Agents/`)
- [Agents/README.md](file:///d:/SetupC/WWW/crm/docs/Agents/README.md): Bảng phân công 13 vai trò AI Agent theo chuẩn workspace.

### 6. 🔄 Quy trình Làm việc (`docs/Workflows/`)
- [Workflows/development.md](file:///d:/SetupC/WWW/crm/docs/Workflows/development.md): Quy trình phát triển tính năng và sửa lỗi.
- [Workflows/antigravity-loop.md](file:///d:/SetupC/WWW/crm/docs/Workflows/antigravity-loop.md): Vòng lặp tự động sửa lỗi Code-Test-Fix-Review.

### 7. 🛡️ Bảo mật & Phân quyền (`docs/Security/`)
- [Security/rules.md](file:///d:/SetupC/WWW/crm/docs/Security/rules.md): Tiêu chuẩn bảo mật (OWASP, Input sanitize, HMAC).
- [Security/threat-model.md](file:///d:/SetupC/WWW/crm/docs/Security/threat-model.md): Mô hình đe dọa và các lỗ hổng đã được audit.
- [Security/secrets.md](file:///d:/SetupC/WWW/crm/docs/Security/secrets.md): Quy tắc quản lý và xoay vòng biến môi trường bảo mật.

### 8. 🧪 Kiểm thử (`docs/Testing/`)
- [Testing/testing-strategy.md](file:///d:/SetupC/WWW/crm/docs/Testing/testing-strategy.md): Chiến lược kiểm thử Unit, Integration và E2E.

### 9. 📖 Vận hành (`docs/Runbooks/`)
- [Runbooks/deploy.md](file:///d:/SetupC/WWW/crm/docs/Runbooks/deploy.md): Hướng dẫn triển khai Production.
- [Runbooks/rollback.md](file:///d:/SetupC/WWW/crm/docs/Runbooks/rollback.md): Hướng dẫn rollback an toàn khi phát sinh lỗi.
- [Runbooks/incident.md](file:///d:/SetupC/WWW/crm/docs/Runbooks/incident.md): Quy trình ứng cứu sự cố khẩn cấp.

### 10. 📝 Nhật ký & Quyết định
- [Changelog/CHANGELOG.md](file:///d:/SetupC/WWW/crm/docs/Changelog/CHANGELOG.md): Nhật ký lịch sử phát triển.
- [Decisions/decision-log.md](file:///d:/SetupC/WWW/crm/docs/Decisions/decision-log.md): Bảng theo dõi các quyết định quan trọng.

