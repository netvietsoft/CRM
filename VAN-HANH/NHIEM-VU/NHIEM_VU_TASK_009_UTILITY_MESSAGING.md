# 🎯 LỆNH GIAO NHIỆM VỤ: TASK-009 — UTILITY MESSAGE TEMPLATES
> **Người giao**: CEO - ORCHESTRATOR (Agent 0)  
> **Người nhận**: Agent 2 (BACKEND) & Agent 3 (FRONTEND)  
> **Mục tiêu**: Xây dựng module Mẫu tin nhắn tiện ích (Utility Templates) có Placeholders đáp ứng yêu cầu xét duyệt Meta App Review (`pages_utility_messaging` & `paid_marketing_messages`).  
> **Thời gian**: 2026-10-17  

---

## 📋 NỘI DUNG NHIỆM VỤ

### 1. Phía Backend (Agent 2 - BACKEND)
- **File**: `backend-nestjs/src/messenger/meta-messenger.client.ts`
  - Bổ sung hàm `sendUtilityMessage(pageToken, recipientPsid, text, tag)`:
    - Gửi request đến `POST me/messages`
    - Cấu hình payload: `{ recipient: { id: psid }, message: { text }, messaging_type: 'MESSAGE_TAG', tag: tag || 'POST_PURCHASE_UPDATE' }`
- **File**: `backend-nestjs/src/messenger/messenger.service.ts`
  - Thêm phương thức `sendUtilityMessage(effectiveStoreId, convId, userId, { text, tag })`
  - Lưu bản ghi vào bảng `msgMessage` (status: `SENT`, direction: `OUT`)
  - Bắn sự kiện socket real-time qua Gateway
- **File**: `backend-nestjs/src/messenger/messenger.controller.ts`
  - Thêm endpoint `POST /messenger/conversations/:id/utility-message` có đầy đủ guards & annotations Swagger.

### 2. Phía Frontend (Agent 3 - FRONTEND)
- **File mới**: `frontend/src/components/ccm/UtilityTemplateModal.tsx`
  - Cung cấp giao diện Popup chọn mẫu tin tiện ích (Utility Message Template).
  - Có các mẫu dựng sẵn:
    - *Xác nhận đơn hàng (Order Confirmation)*
    - *Cập nhật vận chuyển (Shipping Update)*
    - *Cập nhật hỗ trợ khách hàng (Customer Support Ticket)*
    - *Mẫu tùy chỉnh (Custom Template)*
  - Tự động bóc tách các biến `{{variable}}` thành form input có giá trị mặc định.
  - Khung **Xem trước tin nhắn (Live Preview)** cập nhật tức thì theo từng phím gõ.
  - Nút bấm **"Gửi tin tiện ích (Send Utility Message)"** kết nối API backend.
- **Tích hợp vào CCM**:
  - Gắn nút mở Modal vào thanh công cụ của `CcmConversations.tsx` và `MessengerInbox.tsx`.

---

## ⚖️ TIÊU CHUẨN NGHIỆM THU (ACCEPTANCE CRITERIA)
1. Thao tác chọn mẫu tin, nhập placeholders, xem preview mượt mà, trực quan.
2. Tin nhắn gửi thành công được lưu vào lịch sử hội thoại và chuyển qua Meta Graph API bằng tag `POST_PURCHASE_UPDATE`.
3. Kiểm tra TypeScript (`tsc --noEmit`) pass 100% cả Backend và Frontend.
4. Báo cáo hoàn thành được nộp tại `VAN-HANH/AGENT-BAO-CAO`.
