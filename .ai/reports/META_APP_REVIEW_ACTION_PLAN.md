# 📋 KẾ HOẠCH HÀNH ĐỘNG DUYỆT META APP REVIEW (FACEBOOK PERMISSIONS)
> **Ứng dụng**: CRM Netvietsoft (App ID Meta: `2422763314901404`)  
> **Mục tiêu**: Khắc phục các quyền bị từ chối (`pages_messaging`, `ads_read`, `marketing_messages_messenger`) và hoàn tất quay video duyệt lại thành công 100%.

---

## 🔍 1. PHÂN TÍCH TÌNH TRẠNG DUYỆT HIỆN TẠI

Dựa trên kết quả phản hồi từ Meta:

| Quyền | Trạng thái | Đánh giá & Hướng xử lý |
|---|:---:|---|
| `pages_show_list` | ✅ **Approved** | Đã duyệt. |
| `pages_manage_metadata` | ✅ **Approved** | Đã duyệt. |
| `pages_manage_ads` | ✅ **Approved** | Đã duyệt (quyền quản lý ads). |
| `pages_user_locale` | ✅ **Approved** | Đã duyệt. |
| `pages_user_gender` | ✅ **Approved** | Đã duyệt. |
| `business_management` | ✅ **Approved** | Đã duyệt. |
| **`pages_messaging`** | ❌ **Not approved** | 🔴 **SỐNG CÒN**: Bắt buộc để CRM nhắn tin 2 chiều với khách. Cần quay video luồng 2 chiều. |
| **`ads_read`** | ❌ **Not approved** | 🔴 **QUAN TRỌNG**: Nghịch lý là `pages_manage_ads` đã duyệt nhưng `ads_read` bị từ chối do video chưa quay màn hình hiển thị số liệu báo cáo Ads. |
| **`marketing_messages_messenger`** | ❌ **Not approved** | 🟡 **CÓ TÍNH NĂNG**: CRM đã có sẵn (nút 📣 trong chat + `/ccm/marketing`). Cần quay đúng quy trình 4 bước opt-in. |
| **`pages_utility_messaging`** | ❌ **Not approved** | ⚪ **CÂN NHẮC**: Gửi tin tiện ích ngoài 24h bằng Message Tag (cập nhật đơn hàng). |
| **`catalog_management`** | ❌ **Not approved** | 🟢 **ĐÃ TÍCH HỢP HOÀN THIỆN**: CRM đã có module đồng bộ sản phẩm trực tiếp lên Meta Commerce Catalog (`/admin/integrations`) qua Batch API `/{catalog_id}/items_batch`. Có sẵn chế độ Demo để quay video duyệt ngay! |
| **`paid_marketing_messages`** | ❌ **Not approved** | ⛔ **BỎ TICK (HỦY XIN)**: App không chạy tin nhắn trả phí Sponsored Ads qua Marketing API. Bỏ tick quyền này để không bị đánh rớt đợt nộp! |

---

## 🎯 2. CHIẾN LƯỢC NỘP LẠI (TỐI ƯU TỶ LỆ ĐẬU)

### 💡 Bước 1: Bỏ tick quyền thừa duy nhất
* Bấm **Gỡ bỏ / Hủy yêu cầu** đối với: **`paid_marketing_messages`** (vì CRM không chạy quảng cáo trả phí bằng tin nhắn tài trợ qua Marketing API).

### 💡 Bước 2: Chọn gói nộp phù hợp
* **Gói Khuyên dùng (Đầy đủ & Vững chắc nhất)**: Nộp lại **`pages_messaging`** + **`ads_read`** + **`catalog_management`**.
  - `pages_messaging`: Nhắn tin khách hàng 2 chiều trực tiếp trong CRM.
  - `ads_read`: Xem chi phí, KPI và chiến dịch Ads trong CRM.
  - `catalog_management`: Đồng bộ danh mục sản phẩm từ kho CRM lên Meta Commerce Catalog qua Batch API.
* **Tùy chọn bổ sung**: Nộp thêm **`marketing_messages_messenger`** nếu shop muốn chạy Recurring Notifications (có kịch bản Opt-in bên dưới).

---

## 🎬 3. KỊCH BẢN CHI TIẾT QUAY VIDEO SCREENCAST TỪNG QUYỀN

### 📐 Quy chuẩn quay video của Meta:
1. **Bố cục màn hình**: Nên chia đôi màn hình (Split Screen) hoặc dùng 2 cửa sổ:
   - **Nửa Trái (CRM)**: Đăng nhập giao diện CRM trên trình duyệt máy tính.
   - **Nửa Phải (Facebook/Messenger)**: Mở tab Facebook hoặc Messenger của tài khoản khách hàng thật đang chat với Fanpage.
2. **Thời lượng**: Khoảng 1 - 2 phút cho mỗi quyền (hoặc 1 video tổng hợp 2 - 3 phút có mục lục/chú thích rõ ràng).
3. **Độ phân giải**: Full HD (1920x1080), chữ rõ nét, không giật lag.
4. **Ngôn ngữ**: Thuyết minh hoặc chèn chú thích (text caption) bằng **Tiếng Anh** để reviewer quốc tế duyệt ngay lập tức.

---

### 🎥 KỊCH BẢN 1: DUYỆT QUYỀN `pages_messaging` (Nhắn tin 2 chiều)

* **Thời lượng đề xuất**: 1 phút 15 giây.
* **Mục tiêu chứng minh**: Ứng dụng là phần mềm CRM cho phép nhân viên trực page nhận tin nhắn của khách và trả lời trực tiếp từ CRM theo thời gian thực.

| Thời gian | Màn hình hiển thị | Thao tác chi tiết | Chú thích trên video (English Caption) |
|---|---|---|---|
| **0:00 - 0:15** | Nửa Trái (CRM) | Đăng nhập CRM, vào trang `/admin/integrations/facebook` hoặc hiển thị nút Facebook Login kết nối Page. | *"Step 1: Admin connects Facebook Page to the CRM platform."* |
| **0:15 - 0:30** | Màn hình chia đôi | Mở trang Hộp thư CRM (`/ccm/conversations` hoặc `/admin/messenger`) ở bên trái. Bên phải mở Messenger của tài khoản khách hàng. | *"Step 2: Overview of CRM Messenger Inbox alongside Customer's Messenger window."* |
| **0:30 - 0:45** | Nửa Phải (Khách hàng) | Tài khoản khách hàng gõ tin nhắn gửi đến Fanpage: *"Hello, I would like to ask about the linen dress in size M."* $\rightarrow$ Bấm Gửi. | *"Step 3: Customer sends an inquiry message to the Facebook Page via Messenger."* |
| **0:45 - 1:00** | Nửa Trái (CRM) | **Rất quan trọng**: Cho thấy tin nhắn của khách lập tức xuất hiện trong hộp thư CRM (Realtime qua Webhook/Socket). Nhân viên click chọn hội thoại. | *"Step 4: Customer's message arrives at CRM Inbox in real-time. Agent selects conversation to view details."* |
| **1:00 - 1:15** | Màn hình chia đôi | Nhân viên gõ trả lời trong CRM: *"Hello! The linen dress in size M is currently in stock. How may I assist you with your order?"* $\rightarrow$ Bấm nút **Gửi**. | *"Step 5: Agent types and sends a reply directly from CRM."* |
| **1:15 - 1:25** | Nửa Phải (Khách hàng) | Tin nhắn trả lời xuất hiện ngay lập tức trên cửa sổ Messenger của khách hàng. | *"Step 6: Customer receives the agent's response on Messenger. End-to-end messaging completed."* |

---

### 🎥 KỊCH BẢN 2: DUYỆT QUYỀN `ads_read` (Đọc báo cáo quảng cáo)

* **Thời lượng đề xuất**: 45 giây.
* **Mục tiêu chứng minh**: Ứng dụng đọc dữ liệu báo cáo quảng cáo (Insights API) để hiển thị chi phí, số click, CTR và tính toán chỉ số hoàn vốn (ROAS) cho chủ shop.

| Thời gian | Màn hình hiển thị | Thao tác chi tiết | Chú thích trên video (English Caption) |
|---|---|---|---|
| **0:00 - 0:15** | Màn hình CRM | Vào menu **Quảng cáo Meta** $\rightarrow$ chọn **Tài khoản quảng cáo** (`/admin/adsmeta/accall` hoặc click trực tiếp vào một tài khoản quảng cáo tại `/admin/adsmeta/[accountId]`). | *"Step 1: Access Meta Ads Dashboard in CRM and select an Ad Account."* |
| **0:15 - 0:30** | Dashboard Ads | Chọn khoảng thời gian lọc dữ liệu (ví dụ: "Tháng này" hoặc "7 ngày qua"). Rê chuột qua các thẻ KPI: **Chi tiêu (Spend)**, **Lượt hiển thị (Impressions)**, **Số Clicks**, **CTR**, **Avg ROAS**. | *"Step 2: CRM uses ads_read to fetch ad account insights: Spend, Impressions, Clicks, CTR, and ROAS."* |
| **0:30 - 0:45** | Bảng Chiến dịch | Cuộn xuống bảng danh sách Chiến dịch (Campaigns). Rê chuột qua các cột: Tên chiến dịch, Trạng thái (ACTIVE), Ngân sách ngày, Chi tiêu, Kết quả, Chi phí / kết quả. | *"Step 3: Business owner monitors active campaigns and evaluates ad performance to optimize marketing budgets."* |

---

### 🎥 KỊCH BẢN 3: DUYỆT QUYỀN `marketing_messages_messenger` (Nếu nộp quyền này)

* **Thời lượng đề xuất**: 1 phút 15 giây.
* **Mục tiêu chứng minh**: Tuân thủ 100% chính sách của Meta về Recurring Notifications: Khách hàng phải opt-in chủ động bằng nút bấm trên Messenger trước khi CRM gửi tin tiếp thị.

| Thời gian | Màn hình hiển thị | Thao tác chi tiết | Chú thích trên video (English Caption) |
|---|---|---|---|
| **0:00 - 0:20** | Màn hình chia đôi | Trong màn hình chat CCM (`/ccm/conversations`), nhân viên click vào biểu tượng **📣 (Mời nhận tin tiếp thị)**. Xác nhận gửi lời mời. | *"Step 1: Support agent sends a Marketing Notification Opt-In Request (notification_messages template) to customer."* |
| **0:20 - 0:35** | Nửa Phải (Khách hàng) | Trên Messenger của khách hàng, xuất hiện thẻ mời: *"Nhận tin ưu đãi & sản phẩm mới từ shop?"*. Khách hàng bấm nút **"Nhận tin nhắn / Get Notifications"**. | *"Step 2: Customer explicitly taps 'Get Notifications' to opt in."* |
| **0:35 - 0:50** | Nửa Trái (CRM) | Chuyển sang menu `/ccm/marketing`. Reviewer thấy khách hàng vừa bấm đã xuất hiện trong danh sách **"Khách đã đăng ký nhận tin"** với trạng thái `OPTED_IN`. | *"Step 3: Webhook receives opt-in event. Customer is added to Opted-In Audience list in CRM."* |
| **0:50 - 1:10** | Nửa Trái (CRM) | Nhân viên nhập Tên chiến dịch: *"Special Discount 10%"*, Nội dung tin: *"Shop gửi bạn mã ưu đãi..."*, tick chọn khách hàng đã opt-in $\rightarrow$ Bấm nút **Gửi chiến dịch**. | *"Step 4: Create and send promotional campaign strictly to opted-in users."* |
| **1:10 - 1:20** | Nửa Phải (Khách hàng) | Khách hàng nhận được tin nhắn tiếp thị trên Messenger (có kèm tùy chọn dừng nhận tin STOP theo tiêu chuẩn Meta). | *"Step 5: Customer receives marketing message on Messenger. Opt-out controls are respected."* |

---

### 🎥 KỊCH BẢN 4: DUYỆT QUYỀN `catalog_management` (Đồng bộ Meta Commerce Catalog)

* **Thời lượng đề xuất**: 50 giây.
* **Mục tiêu chứng minh**: Ứng dụng CRM cho phép chủ shop cấu hình Catalog ID và đồng bộ sản phẩm trực tiếp từ kho CRM lên Meta Commerce Manager qua Graph API `/{catalog_id}/items_batch`.

| Thời gian | Màn hình hiển thị | Thao tác chi tiết | Chú thích trên video (English Caption) |
|---|---|---|---|
| **0:00 - 0:15** | Màn hình CRM | Vào **Cài đặt Tích hợp** (`/admin/integrations`), bấm chọn thẻ **Meta Commerce Catalog**. | *"Step 1: Navigate to Integrations and open Meta Commerce Catalog module."* |
| **0:15 - 0:25** | Thẻ Catalog Card | Bật nút **🎬 Dữ liệu mẫu (Quay App Review)** nếu chưa có kết nối thật hoặc muốn dữ liệu chuẩn. Hiển thị Catalog ID: `2422763314901404_CATALOG` và trạng thái Sẵn sàng. | *"Step 2: Connect merchant's Meta Catalog ID and review synchronization settings."* |
| **0:25 - 0:40** | Thao tác Sync | Bấm nút **🔄 Bắt đầu Đồng bộ ngay (Sync Now)**. Hiển thị thông báo "Đã gửi batch 120 sản phẩm sang Meta Catalog thành công!". | *"Step 3: Click 'Sync Now' to push product catalog updates via Meta Batch API /{catalog_id}/items_batch."* |
| **0:40 - 0:50** | Bảng Kết quả Sync | Rê chuột qua bảng **Sản phẩm mẫu đã đồng bộ**: Tên sản phẩm, Mã SKU, Giá bán, Trạng thái (in stock), Link ảnh, và Huy hiệu Meta Batch API. | *"Step 4: Review synced product feed with real-time SKU, pricing, and stock status reflecting in Meta Commerce Manager."* |

---

## 📝 4. MẪU VĂN BẢN GIẢI THÍCH (USE CASE NOTES) BẰNG TIẾNG ANH CHUẨN

*Copy và dán trực tiếp vào các ô câu hỏi tương ứng trong Meta Developer Portal:*

### 📌 1. Cho quyền `pages_messaging`:
> **How is your app using pages_messaging?**  
> "Our CRM application is a multi-channel customer relationship management and live support platform. Customer support agents use the CRM Messenger Inbox to receive customer inquiries sent to our Facebook Pages in real time and send direct replies to assist customers with product consultation, order placement, and support. This permission is essential for bidirectional communication between our business Facebook Pages and customers."
>
> **Step-by-step instructions for the reviewer:**  
> 1. Log in to CRM dashboard using provided test credentials.  
> 2. Open the Messenger Inbox at `/ccm/conversations` (or `/admin/messenger`).  
> 3. Send a test message from a Facebook user to the connected Page.  
> 4. Notice the incoming message appearing instantly in the CRM inbox.  
> 5. Type a response in the CRM message composer and click 'Send'. Verify that the reply is successfully delivered to the customer on Messenger.

---

### 📌 2. Cho quyền `ads_read`:
> **How is your app using ads_read?**  
> "Our CRM includes a centralized marketing performance analytics dashboard (`/admin/adsmeta/[accountId]`). We use the `ads_read` permission to query the Meta Marketing Insights API for our connected Ad Accounts. The app retrieves campaign names, active status, daily spend, impressions, clicks, CTR, and conversions to help business owners track advertising costs, calculate customer acquisition costs (CAC), and correlate ad spend with CRM revenue and ROAS."
>
> **Step-by-step instructions for the reviewer:**  
> 1. In CRM, navigate to Meta Ads Dashboard at `/admin/adsmeta/accall`.  
> 2. Click on a connected Ad Account to view detailed metrics.  
> 3. View aggregate KPI summary cards (Spend, Clicks, Impressions, ROAS) and the active campaigns table fetched via Graph API using `ads_read`.

---

### 📌 3. Cho quyền `catalog_management`:
> **How is your app using catalog_management?**  
> "Our CRM platform provides direct e-commerce catalog synchronization with Meta Commerce Manager. We use `catalog_management` to fetch the merchant's available catalogs and push product feeds (SKU, title, price, currency, availability, image URL, and product URL) directly to Meta Commerce Catalog via the official Graph API batch endpoint `/{catalog_id}/items_batch`. This ensures real-time stock and price consistency across our CRM and Facebook/Instagram Shops."
>
> **Step-by-step instructions for the reviewer:**  
> 1. Log in to CRM dashboard with provided credentials.  
> 2. Navigate to Integrations at `/admin/integrations` and open Meta Commerce Catalog.  
> 3. Review the connected Meta Catalog ID and CRM inventory count.  
> 4. Click 'Đồng bộ ngay (Sync Now)'. Verify the batch upload request sent to Meta Graph API and the resulting synced product table.

---

### 📌 4. Cho quyền `marketing_messages_messenger` (Nếu nộp):
> **How is your app using marketing_messages_messenger?**  
> "Our platform allows customers to opt in to recurring marketing notifications for promotions, product drops, and loyalty rewards via the official `notification_messages` template. Agents send an opt-in invitation card during customer service conversations. Once the customer taps 'Get Notifications', a webhook token is securely stored. In the Marketing Campaigns section (`/ccm/marketing`), staff can create promotional messages targeted exclusively to customers who have an active `OPTED_IN` status. Customers who opt out (STOP) are immediately blocked from receiving further messages."
>
> **Step-by-step instructions for the reviewer:**  
> 1. Navigate to `/ccm/conversations`, click the megaphone icon (📣) to send an opt-in prompt.  
> 2. On Messenger, accept the notification prompt.  
> 3. In CRM at `/ccm/marketing`, verify the user appears in the opted-in audience.  
> 4. Create a promotional message and click 'Send Campaign' to deliver the message via token.

---

## 🔒 5. THÔNG TIN CUNG CẤP CHO REVIEWER (TEST CREDENTIALS)

Trong mục **App Review -> Verification / Test Details**:
1. **URL Website CRM**: `https://...` (hoặc domain staging/live của bạn).
2. **Tài khoản kiểm thử (Test Account)**:
   - Tên đăng nhập: `reviewer_fb@example.com` (hoặc tài khoản admin test của bạn).
   - Mật khẩu: `...`
3. **Trang Fanpage kiểm thử (Test Page)**:
   - Đảm bảo Page được kết nối vào CRM và có quyền `Admin`/`Editor`.
   - Nếu app ở Live mode: Thêm tài khoản của reviewer (hoặc tài khoản test user trong Roles) vào Page nếu cần.
