# 📂 CẤU TRÚC THƯ MỤC DỰ ÁN (docs/CAU_TRUC_THU_MUC.md)

> Sơ đồ bố trí thư mục toàn diện theo chuẩn **Development Workspace Standard v1.1**.

```
PROJECT_ROOT/ (D:\SetupC\WWW\crm)
│
├── backend-nestjs/             # Ứng dụng Backend NestJS (Port 3901)
│   ├── src/                    # Mã nguồn các module nghiệp vụ
│   ├── prisma/                 # Prisma ORM Schema & Migrations
│   ├── test/                   # Integration & E2E Tests
│   └── package.json
│
├── frontend/                   # Ứng dụng Frontend Next.js (Port 3900)
│   ├── src/
│   │   ├── app/                # Next.js App Router (Portal, Admin, CCM, Auth)
│   │   ├── components/         # UI Components (Admin, Customer, UI)
│   │   ├── hooks/              # Custom React Hooks
│   │   ├── lib/                # API Clients, Utilities, Formatter
│   │   └── types/              # TypeScript Interfaces & Types
│   └── package.json
│
├── .ai/                        # Hệ thống Điều phối & Trạng thái Máy Đọc cho AI Agent
│   ├── project.yaml            # Cấu hình dự án, stack, lệnh build/test
│   ├── agents.yaml             # Phân quyền 13 AI Agent (writable/forbidden)
│   ├── state.json              # Trạng thái tổng thể, số lượng tasks
│   ├── locks.json              # Khóa file động chống conflict giữa các Agent
│   ├── tasks/                  # Nguồn sự thật quản lý nhiệm vụ (State Directory)
│   │   ├── backlog/            # Hàng đợi nhiệm vụ
│   │   ├── ready/              # Nhiệm vụ sẵn sàng nhận
│   │   ├── running/            # Nhiệm vụ đang thực hiện (bắt buộc có owner)
│   │   ├── review/             # Nhiệm vụ đang chờ review / quality gate
│   │   ├── blocked/            # Nhiệm vụ bị kẹt (bắt buộc có blocked_reason)
│   │   └── done/               # Nhiệm vụ đã hoàn thành qua Quality Gate
│   ├── bugs/                   # Quản lý lỗi tự động (open, fixed, rejected)
│   ├── handoffs/               # Biên bản bàn giao phiên làm việc giữa các Agent
│   └── reports/                # Báo cáo đánh giá của Reviewer / Security
│
├── docs/                       # Thư viện Tài liệu Chuẩn hóa
│   ├── README.md               # Mục lục tài liệu
│   ├── rules.md                # Quy tắc lập trình và cấm kỵ chung
│   ├── CAU_TRUC_THU_MUC.md     # Bản đồ cấu trúc thư mục (file này)
│   │
│   ├── Architecture/           # Tài liệu Kiến trúc Hệ thống
│   │   ├── overview.md         # Tổng quan kiến trúc, luồng request, bootstrap
│   │   ├── backend.md          # Chi tiết các Module Backend & REST Endpoints
│   │   ├── frontend.md         # Bản đồ route, Client/Server Component, State
│   │   ├── database.md         # 60+ Model Prisma, quan hệ, Enums
│   │   ├── integrations.md     # Tích hợp Pancake, ViettelPost, Casso, Meta
│   │   ├── messaging-customer-care.md # Hệ thống CSKH đa kênh, template, campaign
│   │   ├── ads.md              # Dashboard Meta Ads, đồng bộ chiến dịch
│   │   ├── ccm-workspace.md    # Không gian làm việc CCM & Messenger Inbox
│   │   ├── voucher-system.md   # Bản đồ vòng đời Voucher, QR, Gamification
│   │   └── deployment.md       # Kiến trúc hạ tầng triển khai Production
│   │
│   ├── Contracts/              # Hợp đồng Giao tiếp & Data Schema
│   │   ├── viettelpost-api-spec.md
│   │   ├── database-schema.md
│   │   ├── error-codes.md
│   │   └── events.md
│   │
│   ├── ADR/                    # Architecture Decision Records (Quyết định kiến trúc)
│   │   ├── README.md
│   │   ├── ADR-001-nestjs-backend.md
│   │   ├── ADR-002-nextjs-app-router.md
│   │   ├── ADR-003-prisma-mysql.md
│   │   └── ADR-004-bullmq-redis.md
│   │
│   ├── Agents/                 # Tài liệu hướng dẫn & trách nhiệm 13 Roles AI Agent
│   │   ├── README.md
│   │   └── [orchestrator, architect, backend, frontend, tester, fixer...].md
│   │
│   ├── Workflows/              # Quy trình Làm việc
│   │   ├── development.md, feature.md, bug-fix.md, antigravity-loop.md...
│   │
│   ├── Runbooks/               # Hướng dẫn Vận hành & Xử lý sự cố
│   │   ├── deploy.md, rollback.md, incident.md, database-recovery.md
│   │
│   ├── Security/               # Tài liệu & Báo cáo Bảo mật
│   │   ├── rules.md, secrets.md, permissions.md, threat-model.md
│   │
│   ├── Testing/                # Tài liệu Chiến lược Kiểm thử
│   │   ├── testing-strategy.md, unit-test.md, integration-test.md, e2e-test.md
│   │
│   ├── Changelog/              # Nhật ký Thay đổi
│   │   ├── CHANGELOG.md        # Product changelog
│   │   └── agent-log/          # Agent activity log
│   │
│   └── Decisions/              # Bảng Nhật ký Quyết định
│       └── decision-log.md
│
├── scripts/                    # Các Script Tự động hóa & Kiểm tra
│   ├── update-todos.py         # Quét .ai/tasks/ sinh TODOS.md và cập nhật state.json
│   ├── verify.ps1 / verify.sh  # Script kiểm tra Quality Gate (lint, tsc, test)
│   └── rollback.sh             # Script phục hồi phiên bản
│
├── README.md                   # Giới thiệu dự án, setup, navigation
├── AGENTS.md                   # Hiến pháp AI Agent: 20 luật cứng, phân công role, git
├── CLAUDE.md                   # Hướng dẫn riêng cho Claude Code
├── GEMINI.md                   # Hướng dẫn riêng cho Google Antigravity / Gemini
├── .clinerules                 # Hướng dẫn riêng cho Cline / Roo Code
└── TODOS.md                    # Dashboard trạng thái nhiệm vụ (Auto-generated)
```

