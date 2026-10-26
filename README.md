# 🚀 HỆ THỐNG CRM NETVIETSOFT (E-COMMERCE & ĐA KÊNH)

> **Kiến trúc**: E-commerce, Chăm sóc khách hàng đa kênh (SMS, Messenger, Zalo), Tích hợp Meta Ads, Vận chuyển ViettelPost, Đồng bộ Pancake POS, Thanh toán tự động VietQR/Casso.  
> **Phiên bản chuẩn**: Development Workspace Standard v2.1 (Design-Gated Reconstruction Edition)  
> **Ngăn xếp công nghệ**:
> - **Backend**: NestJS (Node.js 20), Prisma ORM, MySQL 8, BullMQ (Redis), Socket.io, Cloudflare R2
> - **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Lucide React

---

## 🧭 BẢN ĐỒ TÀI LIỆU & HƯỚNG DẪN DỰ ÁN

| Tài liệu cốt lõi | Mục đích |
|---|---|
| 🏛️ [AGENTS.md](file:///d:/SetupC/WWW/crm/AGENTS.md) | **Hiến pháp AI Agent**: 20 luật cứng, phân công nhiệm vụ 13 Agent, quy tắc Git, File lock. |
| 📜 [docs/rules.md](file:///d:/SetupC/WWW/crm/docs/rules.md) | **Quy tắc lập trình**: Coding standards, Naming, Error handling, Logging, Database & Security. |
| 📋 [TODOS.md](file:///d:/SetupC/WWW/crm/TODOS.md) | **Dashboard Trạng thái Nhiệm vụ**: Tự động cập nhật từ `.ai/tasks/`. |
| 🏗️ [docs/Architecture/](file:///d:/SetupC/WWW/crm/docs/Architecture/) | **Kiến trúc hệ thống**: Overview, Backend, Frontend, Database, Integrations, Ads, CCM. |
| 📑 [docs/Contracts/](file:///d:/SetupC/WWW/crm/docs/Contracts/) | **Hợp đồng giao tiếp**: ViettelPost API spec, Database schema, Error codes, Events. |
| 🛡️ [docs/Security/](file:///d:/SetupC/WWW/crm/docs/Security/) | **Bảo mật**: Rules, Permissions, Secrets, Threat model, Audit reports. |
| 🧪 [docs/Testing/](file:///d:/SetupC/WWW/crm/docs/Testing/) | **Chiến lược kiểm thử**: Testing strategy, Unit test, Integration test, E2E. |
| 📖 [docs/Runbooks/](file:///d:/SetupC/WWW/crm/docs/Runbooks/) | **Vận hành**: Deploy, Rollback, Phục hồi database, Xử lý sự cố. |
| 📝 [docs/Changelog/](file:///d:/SetupC/WWW/crm/docs/Changelog/) | **Nhật ký thay đổi**: Product changelog và Agent activity log. |
| ⚖️ [docs/ADR/](file:///d:/SetupC/WWW/crm/docs/ADR/) | **Architecture Decision Records**: Ghi nhận các quyết định kiến trúc quan trọng. |

---

## ⚡ CÁCH KHỞI CHẠY DỰ ÁN (LOCAL ENVIRONMENT)

### 1. Yêu cầu Môi trường
- **Node.js**: >= 20 (kèm Corepack / Yarn Berry)
- **Database**: MySQL >= 8.0 (DB: `customer_crm`)
- **Redis** (tùy chọn): Chạy BullMQ queue (nếu không có, queue tự động inline fallback)
- **Thiết lập thư mục Temp**: `$env:TMP="D:\yarn-temp"` (tránh đầy ổ C)

### 2. Khởi chạy Backend (Port `3901`)
```powershell
cd D:\SetupC\WWW\crm\backend-nestjs
$env:TMP="D:\yarn-temp"
corepack yarn@stable start:dev
```
- **REST API Prefix**: `http://localhost:3901/api`
- **Swagger Documentation**: `http://localhost:3901/api/docs`

### 3. Khởi chạy Frontend (Port `3900`)
```powershell
cd D:\SetupC\WWW\crm\frontend
$env:TMP="D:\yarn-temp"
corepack yarn@stable dev
```
- **Frontend Portal / Admin**: `http://localhost:3900`

---

## 🛠️ LỆNH ĐIỀU PHỐI AI AGENT

```bash
# Quét thư mục .ai/tasks/ và sinh Dashboard TODOS.md + update state.json
python scripts/update-todos.py

# Chạy kiểm tra Quality Gate trước khi Merge/Checkpoint commit
powershell ./scripts/verify.ps1   # Windows
bash scripts/verify.sh            # Linux / WSL
```

