# 🏛️ HIẾN PHÁP AI AGENT (AGENTS.md)
> **Dự án**: Hệ thống CRM Đa Kênh & E-commerce (NestJS + Next.js + MySQL + BullMQ + R2)  
> **Phiên bản chuẩn**: Development Workspace Standard v2.1 (Design-Gated Reconstruction Edition)  
> **Áp dụng cho**: Tất cả AI Agents (Claude Code, Antigravity/Gemini, Codex, Roo Code/Cline, DeepSeek, Aider...).

---

## 📖 1. THỨ TỰ BẮT BUỘC KHI BẮT ĐẦU PHIÊN LÀM VIỆC

Mọi AI Agent trước khi sửa bất kỳ dòng code nào đều **BẮT BUỘC** thực hiện tuần tự các bước sau:

1. **Đọc `README.md`**: Nắm tổng quan dự án, tech stack và kiến trúc tổng thể.
2. **Đọc `AGENTS.md` (file này)**: Nắm 20 luật cứng, phân công nhiệm vụ và quy trình.
3. **Đọc `docs/rules.md`**: Nắm quy chuẩn code, naming conventions, xử lý lỗi và cấm kỵ.
4. **Kiểm tra Task được giao**: Đọc file Task YAML trong `.ai/tasks/running/` hoặc `.ai/tasks/ready/` (nắm rõ `files_allowed`, `files_forbidden`, `acceptance_criteria`).
5. **Kiểm tra File Lock**: Đọc `.ai/locks.json` — Tuyệt đối không sửa file đang bị Agent khác khóa (`LOCKED`).
6. **Kiểm tra Git Status & Branch**: Đảm bảo đang ở đúng branch/worktree được chỉ định (Ví dụ: `agent/<role>/<TASK-ID>`).
7. **Đọc tài liệu Architecture & Contracts liên quan**: Tra cứu trong `docs/Architecture/` và `docs/Contracts/`.
8. **Đọc Handoff gần nhất**: Đọc file trong `.ai/handoffs/` để nắm ngữ cảnh dang dở của session trước.
9. **Kiểm tra Bug Report**: Nếu là task sửa lỗi, đọc `.ai/bugs/open/` hoặc file `bug_report.json`.
10. **Không bao giờ bắt đầu code nếu chưa rõ Acceptance Criteria**!

---

## ⚖️ 2. 20 LUẬT CỨNG DÀNH CHO TẤT CẢ AI AGENT

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                  20 LUẬT CỨNG BẮT BUỘC                                 │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1.  Never code without TASK ID.                                                        │
│ 2.  Never modify files outside assigned task scope (files_allowed).                    │
│ 3.  Never modify a locked file in .ai/locks.json.                                      │
│ 4.  Never commit directly to main / master.                                            │
│ 5.  Never modify tests merely to make them pass (CẤM SỬA TEST ĐỂ LÀM XANH).           │
│ 6.  Never delete failing tests.                                                        │
│ 7.  Never skip / disable tests without explicit human approval.                        │
│ 8.  Never disable lint, typecheck, or security checks.                                 │
│ 9.  Never install dependencies without justification and approval (xem docs/rules.md).│
│ 10. Never alter architecture without ADR in docs/ADR/.                                 │
│ 11. Never change database schema without Prisma migration and rollback strategy.       │
│ 12. Never expose secrets, API keys, or credentials in code / git.                      │
│ 13. Never use destructive Git commands automatically (rm -rf, clean -fd, reset --hard).│
│ 14. Never git push --force.                                                            │
│ 15. Always run verification (lint, typecheck, test) before checkpoint commit.         │
│ 16. Always update task state (.ai/tasks/) and run scripts/update-todos.py.             │
│ 17. Always update changelog (docs/Changelog/) for meaningful changes.                  │
│ 18. Always create handoff in .ai/handoffs/ before ending an unfinished session.        │
│ 19. Stop autonomous fix loop after configured maximum attempts (mặc định: 5 cycles).   │
│ 20. If uncertain, inspect project state/code/docs first. NEVER INVENT PROJECT STATE.  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 👥 3. PHÂN VAI HỆ THỐNG AI AGENT (ROSTER)

Dự án vận hành theo mô hình 13 Agent chuyên biệt:

| Agent ID | Tên Agent | Nhiệm vụ chính | Vùng file được sửa (`writable`) | Vùng cấm (`forbidden`) |
|:---:|---|---|---|---|
| **0** | **ORCHESTRATOR** | Điều phối, phân tích requirement, chia Task Graph, giao task, quản lý lock. | `.ai/**`, `TODOS.md` | `backend-nestjs/**`, `frontend/**` |
| **1** | **ARCHITECT** | Thiết kế hệ thống, viết SPEC, viết ADR khi có quyết định kiến trúc lớn. | `docs/Architecture/**`, `docs/ADR/**`, `docs/Contracts/**` | Source code thực thi |
| **2** | **BACKEND** | Logic NestJS, Prisma, API nội bộ, Database service, Queue, Cache, Auth. | `backend-nestjs/src/**`, `backend-nestjs/test/**` | `frontend/**` |
| **3** | **FRONTEND** | Giao diện Next.js, React Component, Tailwind, Client State, API hooks. | `frontend/src/**` | `backend-nestjs/**` |
| **4** | **INTEGRATION** | Tích hợp bên thứ 3 (Pancake, ViettelPost, Facebook OAuth, Meta Ads, Casso). | `backend-nestjs/src/integrations/**`, `webhooks/**` | `frontend/**` |
| **5** | **PAYMENT** | Cổng thanh toán, VietQR, Webhook Casso, Idempotency, Đối soát tiền tệ. | Module thanh toán, hóa đơn, ví hoa hồng | `frontend/**` |
| **6** | **TESTER** | Viết Unit/Integration/E2E test, chạy test, tạo `bug_report.json`. | `tests/**`, `.ai/bugs/**`, `docs/Testing/**` | **CẤM SỬA `src/**`** |
| **7** | **FIXER** | Đọc `bug_report.json`, phân tích root cause, sửa production code. | Source code được chỉ định trong task | Sửa test assertions |
| **8** | **REVIEWER** | Kiểm tra logic, kiến trúc, concurrency, SQL, API contract, duyệt MERGE. | `.ai/reports/**`, review feedback | Source code thực thi |
| **9** | **SECURITY** | Quét SQLi, XSS, CSRF, IDOR, HMAC Webhook, Secret Leak, Permissions. | `docs/Security/**`, security reports | Bỏ qua security rule |
| **10** | **DEVOPS** | Docker, Nginx, CI/CD, Deployment script, Server recovery, Backup/Restore. | `deploy.sh`, `scripts/**`, `docs/Runbooks/**` | Business logic |
| **11** | **DESIGNER** | UI/UX, Design Tokens, Tailwind styling, Component consistency. | `frontend/src/components/**`, CSS | Backend APIs |
| **12** | **DOCUMENTATION**| Đồng bộ tài liệu `docs/`, cập nhật Changelog, rà soát lệch docs vs code. | `docs/**`, `README.md` | Logic nghiệp vụ |

---

## 🔒 4. CƠ CHẾ FILE LOCKING (`.ai/locks.json`)

Để tránh 2 Agent cùng sửa một file gây conflict:
1. Trước khi thao tác, Agent kiểm tra file mục tiêu trong `.ai/locks.json`.
2. Nếu file/folder khớp pattern đã bị Agent khác giữ -> **LOCKED - DO NOT MODIFY**.
3. Nếu cần sửa file đang bị khóa, Agent phải báo Orchestrator để điều phối handoff hoặc unlock.

Ví dụ cấu trúc `.ai/locks.json`:
```json
{
  "backend-nestjs/src/orders/**": {
    "agent": "backend-agent",
    "task": "TASK-003",
    "locked_at": "2026-08-28T12:00:00Z"
  }
}
```

---

## 🌿 5. QUY TẮC GIT & WORKTREE

1. **Tuyệt đối cấm commit trực tiếp lên `main`**.
2. **Quy ước đặt tên Branch**:
   - `agent/backend/TASK-<ID>`
   - `agent/frontend/TASK-<ID>`
   - `agent/fixer/TASK-<ID>`
   - `agent/security/TASK-<ID>`
3. **Quy ước Commit Message**:
   ```
   [TASK-<ID>][<agent-role>] <Mô tả ngắn gọn thay đổi>

   Tests: PASS
   Lint: PASS
   Typecheck: PASS
   ```
4. **Cấm tuyệt đối**: `git push --force`, `git reset --hard` tự động, xóa lịch sử commit.

---

## 🔄 6. VÒNG LẶP TỰ ĐỘNG SỬA LỖI (ANTIGRAVITY LOOP & LOOP GUARD)

Khi chạy test phát hiện lỗi:
1. **TESTER** tạo `bug_report.json` và `.ai/bugs/open/BUG-<ID>.json`.
2. **FIXER** nhận task, đọc báo cáo, phân tích nguyên nhân gốc rễ và sửa code.
3. Chạy lại test. Nếu PASS -> chuyển **REVIEWER** & **SECURITY**.
4. **Loop Guard**: Giới hạn tối đa **5 chu kỳ sửa (max 5 cycles)**. Nếu sau 5 lần vẫn không pass, task tự động chuyển sang `.ai/tasks/blocked/` với trạng thái `[NEED_HUMAN_INTERVENTION]`.

---

## 📋 7. QUẢN LÝ TASK BẰNG STATE DIRECTORY (§35)

Nguồn sự thật của task là các thư mục trạng thái:
- `.ai/tasks/backlog/`: Task đã tạo nhưng chưa sẵn sàng.
- `.ai/tasks/ready/`: Task đã có đủ spec và acceptance criteria, sẵn sàng nhận.
- `.ai/tasks/running/`: Task đang thực hiện (**bắt buộc có trường `owner`**).
- `.ai/tasks/review/`: Task đã code xong, đang chờ Reviewer / Security kiểm tra.
- `.ai/tasks/blocked/`: Task bị kẹt (**bắt buộc có trường `blocked_reason`**).
- `.ai/tasks/done/`: Task đã hoàn thành xuất sắc và vượt qua Quality Gate.

> [!IMPORTANT]
> **Sau mỗi lần chuyển trạng thái task (di chuyển file YAML) hoặc cập nhật task, BẮT BUỘC chạy**:
> ```bash
> python scripts/update-todos.py
> ```
> Script này sẽ tự động sinh lại file `TODOS.md` tại root và cập nhật `.ai/state.json`. **CẤM SỬA TAY FILE `TODOS.md`**.

---

## 🤝 8. BIÊN BẢN BÀN GIAO PHIÊN LÀM VIỆC (HANDOFF)

Trước khi kết thúc phiên làm việc mà task chưa xong hoặc chuyển giao cho Agent khác, Agent **bắt buộc** tạo file handoff tại `.ai/handoffs/HANDOFF-<TASK-ID>.yaml`:

```yaml
task: TASK-003
agent: backend-agent
timestamp: 2026-08-28T18:30:00Z
completed:
  - Bọc $transaction cho OrdersService.createAdminOrder
changed_files:
  - backend-nestjs/src/orders/orders.service.ts
remaining:
  - Viết unit test cho rollback khi order.create thất bại
known_issues:
  - Cần mock PrismaClient transaction trong test
tests_status:
  unit: pass
  lint: pass
next_action: Triển khai unit test trong orders.service.spec.ts
next_agent: tester-agent
```

