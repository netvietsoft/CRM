# 📋 KẾ HOẠCH CHIẾN LƯỢC: HOÀN TẤT DUYỆT 6 QUYỀN META APP REVIEW
> **Kính trình**: Chủ tịch Tony  
> **Người lập**: CEO - ORCHESTRATOR (Agent 0)  
> **Ứng dụng**: CRM Netvietsoft (Meta App ID: `2422763314901404`)  
> **Thời gian**: 2026-10-17  
> **Mục tiêu**: Hoàn thiện 100% tính năng kỹ thuật và quy chuẩn video screencast để duyệt thành công 6 quyền bị từ chối.

---

## 🎯 I. BÁO CÁO PHÂN TÍCH KẾT QUẢ XÉT DUYỆT CỦA META

### 1. Bảng tổng hợp hiện trạng (14 Đã duyệt - 6 Bị từ chối)

| Nhóm | Quyền / Tính năng | Trạng thái | Đánh giá & Giá trị nghiệp vụ |
|:---:|---|:---:|---|
| **Cốt lõi đã duyệt** | `Business Asset User Profile Access` | ✅ **ĐÃ DUYỆT** | **Thắng lợi lớn**: Cho phép lấy tên và avatar thật của khách hàng qua PSID (trước đây bị lỗi #230). |
| | `Marketing API Access Tier` | ✅ **ĐÃ DUYỆT** | Cho phép truy cập hệ thống Ads Marketing API. |
| | `pages_manage_ads` | ✅ **ĐÃ DUYỆT** | Quản lý quảng cáo Fanpage. |
| | `business_management` | ✅ **ĐÃ DUYỆT** | Quản trị tài sản doanh nghiệp Business Manager. |
| | `leads_retrieval` | ✅ **ĐÃ DUYỆT** | Lấy dữ liệu khách hàng tiềm năng (Lead Ads). |
| | `pages_read_engagement`, `pages_manage_metadata`, `pages_show_list`, `public_profile`, `email`, `pages_user_timezone`, `pages_user_locale`, `pages_user_gender` | ✅ **ĐÃ DUYỆT** | Toàn bộ quyền đọc dữ liệu cơ bản và quản lý danh sách Page đã hoàn tất. |
| **6 Quyền bị từ chối** | `pages_messaging` | ❌ **Bị từ chối** | 🔴 **SỐNG CÒN**: Nhắn tin 2 chiều trực tiếp trong CRM. |
| | `ads_read` | ❌ **Bị từ chối** | 🔴 **QUAN TRỌNG**: Đọc số liệu báo cáo, chi phí, ROAS chiến dịch Ads. |
| | `catalog_management` | ❌ **Bị từ chối** | 🟢 **ĐÃ CÓ CODE**: Đồng bộ danh mục sản phẩm kho CRM lên Meta Commerce Catalog. |
| | `marketing_messages_messenger` | ❌ **Bị từ chối** | 🟡 **ĐÃ CÓ CODE**: Gửi tin nhắn tiếp thị qua token thông báo định kỳ (Recurring Notifications). |
| | `pages_utility_messaging` | ❌ **Bị từ chối** | ⚪ **CẦN BỔ SUNG CODE**: Gửi tin tiện ích (xác nhận đơn, vận chuyển) ngoài 24h bằng Message Tag. |
| | `paid_marketing_messages` | ❌ **Bị từ chối** | ⚪ **CÂN NHẮC**: Tin nhắn tiếp thị trả phí (dùng chung kịch bản mẫu tin với Utility). |

---

## 🔍 II. NGUYÊN NHÂN GỐC RỄ BỊ TỪ CHỐI (ROOT CAUSE ANALYSIS)

Toàn bộ 6 quyền bị từ chối đều có chung kết luận từ Meta:
> *"Chúng tôi xác định rằng trường hợp sử dụng ứng dụng của bạn hợp lệ nhưng video quay màn hình bạn đã gửi không trình bày rõ trải nghiệm toàn diện của trường hợp sử dụng đã mô tả..." (Chính sách 1.6 - Tạo ra sản phẩm đáng tin cậy)*

Điều này khẳng định: **Mô hình kinh doanh và use-case của CRM Netvietsoft được Meta công nhận là HỢP LỆ 100%**. Việc bị đánh trượt thuần túy do **Video Screencast thiếu các bước thao tác cụ thể mà Reviewer đòi hỏi**.

Cụ thể theo từng nhóm ghi chú của Reviewer:

### 1. Với `pages_messaging`:
- **Yêu cầu của Reviewer**:
  > *"Please re-record showing: (1) asset selection (Page, account, or number visible), (2) a live send action from your app, and (3) the delivered message in the native client."*
- **Lý do rớt trước đây**: Video trước không quay đồng thời 2 màn hình (Split screen) chứng minh: khi nhân viên gõ chữ và bấm "Gửi" trên CRM, thì ngay lập tức tin nhắn đó xuất hiện trên ứng dụng Messenger của khách hàng.

### 2. Với `pages_utility_messaging` & `paid_marketing_messages`:
- **Yêu cầu của Reviewer**:
  > *"To verify template use, please re-record showing: (1) creation or selection of a utility or marketing message template, (2) how the template is populated with placeholders (name, order ID, etc.), and (3) sending the message to a test recipient and showing the delivered template message in the native client."*
- **Lý do rớt trước đây**: CRM chưa có giao diện chọn mẫu tin tiện ích (Utility Template) có các biến giữ chỗ (placeholders như `{{customer_name}}`, `{{order_id}}`), chưa thể hiện việc điền thông tin và bấm gửi tin tiện ích giao hàng/xác nhận đơn đến Messenger.

### 3. Với `ads_read`:
- **Lý do rớt trước đây**: Video không quay đủ luồng từ lúc đăng nhập Facebook Login cấp quyền `ads_read` cho đến khi mở màn hình Dashboard Ads xem các chỉ số chi phí, click, impressions và bảng danh sách chiến dịch.

### 4. Với `catalog_management`:
- **Lý do rớt trước đây**: Video không quay luồng đăng nhập cấp quyền và thao tác nhấn nút "Đồng bộ sản phẩm" sang Meta Catalog.

---

## 🛠️ III. KẾ HOẠCH HÀNH ĐỘNG KỸ THUẬT (DEVELOPMENT ACTION PLAN)

Để đáp ứng chính xác 100% yêu cầu của Reviewer, CEO điều phối triển khai các hạng mục:

### Task 1: Bổ sung "Modal Mẫu tin tiện ích / Utility Template" vào khung chat Messenger (Cho `pages_utility_messaging` & `paid_marketing_messages`)
- **Backend (`MessengerService` & `MetaMessengerClient`)**:
  - Thêm endpoint `POST /messenger/conversations/:id/send-utility-template`.
  - Hỗ trợ gửi tin nhắn với `messaging_type: 'MESSAGE_TAG'` và `tag: 'POST_PURCHASE_UPDATE'` (chuẩn Meta cho tin tiện ích đơn hàng).
- **Frontend (`CcmConversations.tsx` & `MessengerInbox.tsx`)**:
  - Thêm nút **📋 Mẫu tin tiện ích (Utility Template)** ngay trên thanh công cụ chat.
  - Khi bấm, mở Popup cho phép:
    1. Chọn mẫu tin có sẵn:
       - *Mẫu 1: Xác nhận đơn hàng (Order Confirmation)*
       - *Mẫu 2: Cập nhật giao hàng (Shipping Update)*
       - *Mẫu 3: Thông báo trạng thái tài khoản/vé hỗ trợ (Support Ticket)*
    2. Các ô nhập biến Placeholder: `{{customer_name}}`, `{{order_id}}`, `{{total_amount}}`, `{{tracking_number}}`.
    3. Tự động điền (Pre-fill) từ thông tin khách và đơn hàng hiện tại nếu có.
    4. Màn hình xem trước (Live Preview) nội dung mẫu tin được render theo thời gian thực.
    5. Nút bấm **"Gửi tin tiện ích (Send Utility Message)"** gửi trực tiếp qua Graph API và hiển thị ngay trên hội thoại.

### Task 2: Kiểm tra và chuẩn bị dữ liệu mẫu cho các màn hình quay video
- Đảm bảo `/admin/adsmeta/accall` và `/admin/adsmeta/[accountId]` hiển thị đầy đủ thẻ KPI Ads (`ads_read`).
- Đảm bảo thẻ `MetaCatalogCard` tại `/admin/integrations` có sẵn chế độ Demo Catalog (`catalog_management`).
- Đảm bảo `/ccm/marketing` có sẵn danh sách khách đã Opt-in và form gửi chiến dịch (`marketing_messages_messenger`).

---

## 🎬 IV. QUY TRÌNH & KỊCH BẢN QUAY VIDEO SCREENCAST CHUẨN META (TỪNG QUYỀN)

### 📐 Quy chuẩn bắt buộc khi quay:
1. **Bố cục 2 cửa sổ song song (Split Screen 50/50)**:
   - **Nửa trái**: Trình duyệt mở CRM Netvietsoft (giao diện Tiếng Anh hoặc có chú thích Tiếng Anh rõ ràng).
   - **Nửa phải**: Trình duyệt hoặc điện thoại mở Facebook / Messenger của tài khoản khách hàng thử nghiệm.
2. **Độ phân giải**: Full HD (1920x1080), 30-60 fps, chữ nét rõ ràng.
3. **Mỗi quyền quay 1 video ngắn từ 1 - 2 phút**, có text caption tiếng Anh chú thích từng bước.

---

### 🎥 Kịch bản 1: Quyền `pages_messaging` (Nhắn tin 2 chiều trực tiếp)
- **0:00 - 0:15**: Mở màn hình CRM Hộp thư (`/ccm/conversations`). Rê chuột vào tên Fanpage đang kết nối (đáp ứng tiêu chí: *Asset selection visible*).
- **0:15 - 0:30**: Bên phải (Khách hàng Messenger) gõ: *"Hello shop, I would like to check product availability."* $\rightarrow$ Gửi.
- **0:30 - 0:45**: Bên trái (CRM) tin nhắn lập tức xuất hiện trong hộp thư real-time. Nhân viên chọn hội thoại.
- **0:45 - 1:00**: Nhân viên gõ trả lời trong CRM: *"Hello! The product is currently available in stock. May I help you with your order?"* $\rightarrow$ Bấm **Gửi**.
- **1:00 - 1:15**: Bên phải (Messenger khách hàng) nhận được tin nhắn trả lời ngay lập tức.

---

### 🎥 Kịch bản 2: Quyền `pages_utility_messaging` & `paid_marketing_messages` (Mẫu tin tiện ích có placeholders)
- **0:00 - 0:20**: Trong hội thoại chat CRM, nhân viên bấm vào nút **📋 Utility Templates**.
- **0:20 - 0:40**: Trong danh sách dropdown, chọn mẫu: *"Order Confirmation Template"*. Màn hình hiển thị mẫu tin có placeholders: `{{customer_name}}`, `{{order_id}}`, `{{total_amount}}`.
- **0:40 - 1:00**: Thao tác nhập giá trị vào các ô placeholders:
  - `{{customer_name}}`: John Doe
  - `{{order_id}}`: #ORD-8899
  - `{{total_amount}}`: $120.00
  - Live Preview hiển thị nội dung tin nhắn hoàn chỉnh.
- **1:00 - 1:20**: Bấm nút **Send Utility Message**.
- **1:20 - 1:40**: Quay sang cửa sổ Messenger của khách hàng: Tin nhắn thông báo xác nhận đơn hàng với đầy đủ thông tin vừa điền xuất hiện ngay lập tức trong hộp thư Messenger.

---

### 🎥 Kịch bản 3: Quyền `marketing_messages_messenger` (Tin tiếp thị định kỳ)
- **0:00 - 0:25**: Trong khung chat, nhân viên bấm biểu tượng 📣 để gửi thẻ mời Opt-in (*notification_messages*).
- **0:25 - 0:45**: Trên Messenger của khách hàng, xuất hiện thẻ mời: *"Opt in to receive promotions?"*. Khách hàng bấm **"Get Notifications"**.
- **0:45 - 1:05**: Chuyển sang menu `/ccm/marketing` trên CRM. Danh sách khách hàng hiển thị tài khoản vừa bấm với trạng thái `OPTED_IN`.
- **1:05 - 1:30**: Nhân viên tạo chiến dịch *"Weekend Sale 20%"*, chọn khách hàng đã opt-in và bấm **Gửi chiến dịch**.
- **1:30 - 1:45**: Cửa sổ Messenger của khách hàng nhận được tin nhắn tiếp thị.

---

### 🎥 Kịch bản 4: Quyền `ads_read` (Báo cáo quảng cáo Meta)
- **0:00 - 0:15**: Mở màn hình đăng nhập Meta OAuth cấp quyền `ads_read`.
- **0:15 - 0:35**: Điều hướng tới **Meta Ads Dashboard** (`/admin/adsmeta/accall`), chọn tài khoản quảng cáo.
- **0:35 - 1:00**: Rê chuột qua các thẻ chỉ số hiệu suất: Spend, Impressions, Clicks, CTR, ROAS.
- **1:00 - 1:20**: Cuộn xuống bảng danh sách Chiến dịch (Campaigns), cho thấy trạng thái ACTIVE, ngân sách hàng ngày và kết quả đo lường.

---

### 🎥 Kịch bản 5: Quyền `catalog_management` (Đồng bộ danh mục Meta Commerce)
- **0:00 - 0:15**: Vào mục **Cài đặt Tích hợp** (`/admin/integrations`), chọn thẻ **Meta Commerce Catalog**.
- **0:15 - 0:35**: Nhập Catalog ID kết nối với Meta Commerce Manager. Bật chế độ Demo hoặc chọn kho sản phẩm CRM.
- **0:35 - 0:55**: Bấm nút **🔄 Bắt đầu Đồng bộ ngay (Sync Now)**. Hệ thống gửi batch sản phẩm qua Graph API `/{catalog_id}/items_batch`.
- **0:55 - 1:15**: Bảng danh sách sản phẩm hiển thị trạng thái đồng bộ thành công (SKU, giá, tồn kho). Mở song song Meta Commerce Manager để đối chiếu.

---

## 📌 V. ĐỀ XUẤT PHÊ DUYỆT TỪ CHỦ TỊCH TONY

Kính trình Chủ tịch Tony xem xét và chỉ đạo:
1. **Phê duyệt triển khai Task 1**: Xây dựng ngay giao diện & backend cho **Modal Mẫu tin tiện ích (Utility Template)** với các biến placeholder để đáp ứng 100% yêu cầu của Meta Reviewer cho `pages_utility_messaging` và `paid_marketing_messages`.
2. **Chiến lược nộp lại**: Giữ nguyên danh sách nộp cả 6 quyền, bổ sung đầy đủ video theo đúng 5 kịch bản chuẩn ở trên.
3. Sau khi Chủ tịch phê duyệt, CEO sẽ lập tức phát lệnh Task Graph vào thư mục `VAN-HANH/NHIEM-VU` cho Backend (Agent 2) và Frontend (Agent 3) thực thi hoàn thành ngay trong ngày.
