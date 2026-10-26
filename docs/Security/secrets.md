# 🔐 HƯỚNG DẪN BẢO MẬT & XOAY VÒNG SECRETS (SEC-02)

> **Mục tiêu**: Đảm bảo không lộ thông tin nhạy cảm (API Keys, Database Credentials, JWT Secrets, OAuth Tokens) trong Git repository và cung cấp quy trình xoay vòng (rotation) khi có sự cố hoặc định kỳ.

---

## 📋 1. NGUYÊN TẮC QUẢN LÝ BIẾN MÔI TRƯỜNG

1. **Tuyệt đối cấm commit các file `.env`**:
   - Mọi file môi trường (`.env`, `.env.prod`, `.env.production`, `.env.local`, `.env.*.local`) phải được khai báo trong `.gitignore`.
   - Chỉ commit các file template mẫu như `.env.example` với giá trị dummy (ví dụ: `JWT_SECRET=replace_me_with_random_32_chars_secret`).
2. **Lưu trữ Secrets trên Production**:
   - Sử dụng biến môi trường server (Linux `/etc/environment`, Docker env secrets, systemd service env, hoặc PM2 ecosystem config không commit).
   - Mã hoá các sensitive tokens lưu trong database (dùng Token Vault AES-256-GCM).

---

## 🔄 2. QUY TRÌNH XOAY VÒNG SECRETS (ROTATION RUNBOOK)

### A. JWT Secret (`JWT_SECRET`, `JWT_REFRESH_SECRET`)
* **Tần suất**: Khi nhân sự quản trị nghỉ việc hoặc định kỳ 6 tháng/lần.
* **Quy trình xoay vòng**:
  1. Sinh chuỗi ngẫu nhiên có độ dài tối thiểu 64 ký tự:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
  2. Cập nhật `JWT_SECRET` và `JWT_REFRESH_SECRET` trên server production.
  3. Xoá phiên làm việc cũ trong database (hoặc huỷ các token trong bảng `refresh_tokens`).
  4. Khởi động lại dịch vụ backend (`pm2 restart crm-backend`).

---

### B. Database Credentials (`DATABASE_URL`)
* **Tần suất**: Định kỳ hoặc khi phát hiện rò rỉ.
* **Quy trình xoay vòng**:
  1. Tạo tài khoản MySQL phụ hoặc đổi mật khẩu user MySQL hiện tại trên cơ sở dữ liệu:
     ```sql
     ALTER USER 'crm_user'@'%' IDENTIFIED BY 'NewStrongPassword_2026!#';
     FLUSH PRIVILEGES;
     ```
  2. Cập nhật `DATABASE_URL` trong file cấu hình trên server:
     ```
     DATABASE_URL="mysql://crm_user:NewStrongPassword_2026!#@127.0.0.1:3306/crm_db?sslmode=require"
     ```
  3. Chạy kiểm tra kết nối: `npx prisma db pull` hoặc khởi động lại backend.

---

### C. Pancake API Key & Webhook Secret
* **Tần suất**: Khi có sự cố bảo mật hoặc đổi nhân sự quản trị Pancake.
* **Quy trình xoay vòng**:
  1. Đăng nhập vào trang quản trị Pancake POS (`pos.pages.fm`).
  2. Truy cập Cài đặt cửa hàng -> Tạo API Key mới / Webhook Secret mới.
  3. Cập nhật trong bảng `store_integrations` qua giao diện Admin CRM (`/admin/integrations/pancake`) hoặc chạy SQL:
     ```sql
     UPDATE store_integrations 
     SET api_key = 'NEW_PANCAKE_API_KEY', 
         api_secret = 'NEW_PANCAKE_SECRET'
     WHERE platform = 'PANCAKE' AND store_id = 'STORE_ID';
     ```
  4. Cấu hình lại URL Webhook Pancake nếu có thay đổi.

---

### D. ViettelPost API & Webhook Secret
* **Tần suất**: Khi thay đổi tài khoản hoặc định kỳ.
* **Quy trình xoay vòng**:
  1. Đổi mật khẩu tài khoản ViettelPost trên cổng ViettelPost.
  2. Cập nhật lại mật khẩu trong bảng `vtp_accounts` (qua chức năng Token Vault đã mã hoá) hoặc biến môi trường `VIETTELPOST_PASSWORD`.
  3. Cập nhật Webhook Secret trong `StoreIntegration.metadata.webhookSecret`.

---

### E. Meta / Facebook App Secret & OAuth Tokens
* **Tần suất**: Khi Access Token hết hạn hoặc có cảnh báo từ Meta Developers.
* **Quy trình xoay vòng**:
  1. Truy cập `developers.facebook.com` -> Ứng dụng CRM -> Cài đặt nâng cao -> Xoay vòng App Secret.
  2. Cập nhật `FACEBOOK_CLIENT_SECRET` và `META_APP_SECRET`.
  3. Kết nối lại OAuth từ giao diện Admin (`/admin/integrations/facebook`) để sinh User Token & Page Tokens mới.

---

### F. Cloudflare R2 Storage (Media Upload)
* **Quy trình xoay vòng**:
  1. Đăng nhập Cloudflare Dashboard -> R2 -> API Tokens -> Create API Token.
  2. Cập nhật `R2_ACCESS_KEY_ID` và `R2_SECRET_ACCESS_KEY`.
  3. Thu hồi (Revoke) token cũ sau khi kiểm tra upload media hoạt động bình thường.

---

## 🛡️ 3. KIỂM TRA TRƯỚC KHI COMMIT (PRE-COMMIT HYGIENE)

Luôn chạy lệnh kiểm tra trước khi push mã nguồn:
```bash
git status
git ls-files | Select-String "\.env"
```
Đảm bảo kết quả không chứa bất kỳ file môi trường thật nào.
