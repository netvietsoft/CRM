# 🤖 HƯỚNG DẪN DÀNH CHO GOOGLE ANTIGRAVITY & GEMINI (GEMINI.md)

> Theo nguyên tắc **Không Duplicate Luật (§3)** của *Development Workspace Standard*, toàn bộ hiến pháp và quy tắc lập trình được lưu trữ tập trung tại `AGENTS.md` và `docs/rules.md`.

---

## 📌 NGUYÊN TẮC BẮT BUỘC ĐỐI VỚI GEMINI / ANTIGRAVITY

1. **Hiến pháp AI**: Bắt buộc đọc và tuân thủ [AGENTS.md](file:///d:/SetupC/WWW/crm/AGENTS.md) trước khi thực hiện bất kỳ thay đổi nào.
2. **Quy chuẩn Code**: Tuân thủ nghiêm ngặt [docs/rules.md](file:///d:/SetupC/WWW/crm/docs/rules.md).
3. **Quản lý Task**:
   - Chỉ làm việc khi có Task ID cụ thể trong thư mục `.ai/tasks/running/` hoặc `.ai/tasks/ready/`.
   - Chỉ sửa các file được phép trong `files_allowed` của Task.
   - Sau khi hoàn thành hoặc đổi trạng thái task, chạy `python scripts/update-todos.py` để cập nhật [TODOS.md](file:///d:/SetupC/WWW/crm/TODOS.md).
4. **Kiểm tra File Lock**: Luôn kiểm tra `.ai/locks.json` trước khi sửa file.
5. **Cấm sửa Test để làm xanh**: Tuyệt đối không xóa, nới lỏng assertion hoặc bỏ qua test lỗi.
6. **Kiểm tra trước khi commit**: Chạy verification (lint, typecheck, test) trước khi commit.

---

## 🛠️ LỆNH THƯỜNG DÙNG

```bash
# Cập nhật Dashboard Task tự động
python scripts/update-todos.py

# Chạy kiểm tra toàn diện Quality Gate
powershell ./scripts/verify.ps1
```

