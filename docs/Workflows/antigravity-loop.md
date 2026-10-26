# 🔄 VÒNG LẶP TỰ ĐỘNG SỬA LỖI (ANTIGRAVITY LOOP) (docs/Workflows/antigravity-loop.md)

> Cơ chế tự động phát hiện lỗi, cô lập nguyên nhân, sửa mã nguồn và tái kiểm thử tự động.

---

## 1. Sơ đồ Vòng lặp

```
           ┌───────────────────────┐
           │   TEST RUNNER (FAIL)  │
           └───────────┬───────────┘
                       │
                       ▼
           ┌───────────────────────┐
           │    bug_report.json    │
           │  .ai/bugs/open/*.json │
           └───────────┬───────────┘
                       │
                       ▼
           ┌───────────────────────┐
           │      FIXER AGENT      │
           │ (Phân tích Root Cause)│
           └───────────┬───────────┘
                       │
                       ▼
           ┌───────────────────────┐
           │   Sửa Production Code │
           └───────────┬───────────┘
                       │
                       ▼
           ┌───────────────────────┐
           │   Tái Kiểm thử Test   │
           └───────────┬───────────┘
                       │
           ┌───────────┴───────────┐
    [FAIL] │                       │ [PASS]
           ▼                       ▼
┌─────────────────────┐ ┌─────────────────────┐
│  Chu kỳ tiếp theo   │ │  QUALITY GATE PASS  │
│  (Max = 5 cycles)   │ │  Chuyển sang Review │
└─────────────────────┘ └─────────────────────┘
```

---

## 2. Loop Guard & Cơ chế Chống Lặp Vô hạn (§11)
- **Giới hạn chu kỳ**: Tối đa **5 chu kỳ sửa liên tiếp (max 5 cycles)** cho một nhiệm vụ.
- **Xử lý khi vượt ngưỡng**:
  1. Tự động dừng vòng lặp sửa lỗi tự động.
  2. Di chuyển task vào `.ai/tasks/blocked/TASK-xxx.yaml`.
  3. Ghi lý do vào trường `blocked_reason: "[ESCALATION_REQUIRED] Đã thử 5 lần sửa nhưng test vẫn không qua"`.
  4. Chạy `python scripts/update-todos.py` để gắn cờ báo động trên `TODOS.md` yêu cầu người thật hoặc Orchestrator can thiệp.

