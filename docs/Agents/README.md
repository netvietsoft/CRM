# 👥 HỆ THỐNG PHÂN VAI AI AGENTS (docs/Agents/README.md)

> Chi tiết nhiệm vụ, quyền hạn và ranh giới hoạt động của 13 Roles AI Agent theo chuẩn **Development Workspace Standard v1.1 (§4)**.

---

## 1. Danh sách 13 Roles AI Agent

```
                        ┌────────────────────────────────────────┐
                        │          Agent 0: ORCHESTRATOR         │
                        │    (Điều phối, Chia Task, Quản lý Lock)│
                        └───────────────────┬────────────────────┘
                                            │
               ┌────────────────────────────┴────────────────────────────┐
               ▼                                                         ▼
  ┌─────────────────────────┐                               ┌─────────────────────────┐
  │   Agent 1: ARCHITECT    │                               │   Agent 11: DESIGNER    │
  │ (Thiết kế hệ thống, ADR)│                               │    (UI/UX, Tokens, CSS) │
  └────────────┬────────────┘                               └────────────┬────────────┘
               │                                                         │
               └────────────────────────────┬────────────────────────────┘
                                            │ SPEC / TASK GRAPH
                                            ▼
       ┌──────────────────────┬──────────────────────┬──────────────────────┐
       ▼                      ▼                      ▼                      ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Agent 2    │       │   Agent 3    │       │   Agent 4    │       │   Agent 5    │
│   BACKEND    │       │   FRONTEND   │       │ INTEGRATION  │       │   PAYMENT    │
└──────┬───────┘       └──────┬───────┘       └──────┬───────┘       └──────┬───────┘
       │                      │                      │                      │
       └──────────────────────┴──────────┬───────────┴──────────────────────┘
                                         │ CODE SUBMISSION
                                         ▼
                              ┌──────────────────────┐
                              │   Agent 6: TESTER    │
                              │ (Chạy test, Bug Log) │
                              └──────────┬───────────┘
                                         │
                        ┌────────────────┴────────────────┐
                 [FAIL] │                                 │ [PASS]
                        ▼                                 ▼
             ┌──────────────────────┐          ┌──────────────────────┐
             │    Agent 7: FIXER    │          │  Agent 8: REVIEWER   │
             │(Sửa code production) │          │  Agent 9: SECURITY   │
             └──────────┬───────────┘          └──────────┬───────────┘
                        │                                 │
                        └──────────(TEST LẠI)─────────────┘
                                                          │ [QUALITY GATE PASS]
                                                          ▼
                                               ┌──────────────────────┐
                                               │   Agent 10: DEVOPS   │
                                               │   Agent 12: DOCS     │
                                               │ (Merge, Deploy, Log) │
                                               └──────────────────────┘
```

---

## 2. Nguyên tắc Bất biến
1. **Agent không code trực tiếp nếu không có Task ID**.
2. **Tester tuyệt đối không sửa code production** (chỉ sửa `tests/**` và ghi `bug_report.json`).
3. **Fixer tuyệt đối không sửa test assertions** để làm xanh bài kiểm tra.
4. **Mọi Agent phải tuân thủ quyền `writable` và `forbidden`** được định nghĩa trong `.ai/agents.yaml`.

