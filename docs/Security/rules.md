# 🛡️ TIÊU CHUẨN BẢO MẬT HỆ THỐNG (docs/Security/rules.md)

---

## 1. Tiêu chuẩn Kiểm tra Bảo mật Bắt buộc (Security Checklist)

1. **Chống SQL Injection**: Sử dụng Prisma Client parameterized queries, không ghép chuỗi thô trong `prisma.$queryRawUnsafe`.
2. **Chống XSS (Cross-Site Scripting)**:
   - Frontend không dùng `dangerouslySetInnerHTML` với dữ liệu do người dùng nhập.
   - API upload file whitelist định dạng, chặn file `.html`, `.svg` chứa script độc hại.
3. **Chống Giả mạo Webhook (Webhook Inbound Protection)**:
   - Mọi webhook từ đối tác ngoài (Pancake, ViettelPost, Casso, Meta Messenger) **bắt buộc** phải xác thực chữ ký HMAC bằng `crypto.timingSafeEqual`.
4. **Phân quyền Đa Tenant (Multi-Tenant Isolation)**:
   - Non-admin (MODERATOR/STAFF) luôn bị ràng buộc bởi `effectiveStoreId`. Không được phép truy cập hoặc chỉnh sửa tài nguyên của Store khác.
5. **Chống Open Redirect**:
   - Mọi tham số `returnTo` phải được chuẩn hóa, chỉ chấp nhận relative URL hợp lệ (`/portal/...`, `/admin/...`).
6. **Bảo vệ Secret & Biến môi trường**:
   - Tuyệt đối không commit file `.env.prod` lên Git.
   - Không trả về secret key hoặc token qua API response.

