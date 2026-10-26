# 💬 KHÔNG GIAN LÀM VIỆC CCM & MESSENGER LIVE CHAT (docs/Architecture/ccm-workspace.md)

> Không gian làm việc CSKH toàn màn hình phong cách Pancake POS: `/ccm/*`.

---

## 1. Kiến trúc Giao diện 4 Cột (`CcmConversations.tsx`)
1. **Cột 1 (Rail lọc & Page Selector)**: Chọn Fanpage, lọc hội thoại theo nhãn (Chưa đọc, Có SĐT, Đã đặt đơn, Gắn sao ưu tiên).
2. **Cột 2 (Danh sách Hội thoại)**: Danh sách khách hàng chat, avatar, tin nhắn cuối, phân công nhân viên phụ trách.
3. **Cột 3 (Khung Chat Trực tiếp & Soạn thảo)**: Lịch sử tin nhắn 2 chiều, gợi ý tin nhắn mẫu (`Quick Replies`), thư viện media R2 (`CcmImagePicker`), gợi ý từ AI Agent Claude.
4. **Cột 4 (Thông tin Khách hàng & Lên đơn trực tiếp)**: Hồ sơ khách, lịch sử đơn hàng cũ, form tạo đơn hàng admin nhanh và nút đẩy đơn sang ViettelPost (`CcmViettelPushDialog`).

---

## 2. AI Agent Tư vấn & Chốt đơn Tự động (`src/ai-agent`)
- Sử dụng mô hình Anthropic Claude để tự động phân tích ý định của khách hàng.
- **3 Chế độ Vận hành**:
  - `OFF`: Tắt hoàn toàn AI.
  - `SHADOW`: AI sinh câu trả lời và đơn hàng nháp, hiển thị tại ô chat để nhân viên duyệt trước khi gửi.
  - `AUTO`: AI tự động phản hồi khách hàng và tự động tạo đơn hàng `PENDING` khi chốt thành công.
- **Guardrails**: Kiểm soát cửa sổ phản hồi 24h của Meta, tự động chuyển giao cho nhân viên (`HANDOFF`) khi phát sinh ngoại lệ hoặc khi khách yêu cầu người thật.

