# 🔄 QUY TRÌNH PHÁT TRIỂN CHUẨN (docs/Workflows/development.md)

> Quy trình từ lúc tiếp nhận yêu cầu cho tới khi hoàn tất nghiệm thu và phát hành phiên bản.

---

## 1. Các Giai đoạn Phát triển (Phases)

1. **Giai đoạn 1: Phân tích & Đặc tả (Requirement & Architecture)**:
   - User gửi yêu cầu.
   - Orchestrator phân tích, kiểm tra tính tương thích kiến trúc.
   - Architect viết SPEC và tạo Task Graph trong `.ai/tasks/ready/`.
2. **Giai đoạn 2: Khóa File & Thực thi (Lock & Implementation)**:
   - Cập nhật `.ai/locks.json` để khóa các file liên quan.
   - Di chuyển task sang `.ai/tasks/running/` (gán `owner`).
   - Chạy `python scripts/update-todos.py`.
   - Agent tiến hành viết mã nguồn và unit test tương ứng.
3. **Giai đoạn 3: Kiểm thử & Quality Gate**:
   - Chạy verification script (`scripts/verify.ps1`).
   - Nếu test fail: Chuyển sang vòng lặp sửa lỗi **Antigravity Loop**.
   - Nếu test pass: Di chuyển task sang `.ai/tasks/review/`.
4. **Giai đoạn 4: Review & Hoàn tất**:
   - Reviewer và Security Agent kiểm tra code và bảo mật.
   - Di chuyển task sang `.ai/tasks/done/`.
   - Xóa file lock trong `.ai/locks.json`.
   - Chạy `python scripts/update-todos.py` để cập nhật `TODOS.md` và `state.json`.
   - Cập nhật `docs/Changelog/CHANGELOG.md`.

