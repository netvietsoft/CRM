# 🧭 CRM NETVIETSOFT — FILE NGỮ CẢNH CHO AI (đọc đầu tiên mỗi phiên)

> MỤC ĐÍCH: Trước khi code/sửa bất cứ thứ gì trong dự án này, ĐỌC LẠI file này
> và file liên quan trong `docs/`. Tránh quên ngữ cảnh, sửa sai, viết bậy, trùng lặp.
> File này là "bản đồ". Chi tiết nằm trong `docs/`.
> Cập nhật lần cuối tài liệu: 2026-07-01 (Meta Ads nâng cấp, Messenger inbox, CCM workspace /ccm/*,
>   Facebook OAuth + token vault). Tất cả đã hợp nhất trên nhánh `main`. Xem docs/changelog.md.

═══════════════════════════════════════════════════════════════════════
## 1. DỰ ÁN LÀ GÌ
═══════════════════════════════════════════════════════════════════════
CRM e-commerce + chăm sóc khách hàng đa kênh (SMS-first) cho thị trường VN.
Gồm 2 phần TÁCH BIỆT, giao tiếp qua REST API:

  backend-nestjs/   → NestJS + Prisma + MySQL + BullMQ + WebSocket + Swagger
  frontend/         → Next.js 16 (App Router) + React 19 + Tailwind 4
                      (CHỈ gọi API backend qua NEXT_PUBLIC_API_URL — KHÔNG
                       truy cập DB trực tiếp; prisma ở frontend chỉ cho seed/script)

Repo gốc: https://github.com/netvietsoft/crm.git (branch main)
Vị trí local: D:\SetupC\WWW\crm

═══════════════════════════════════════════════════════════════════════
## 2. CHẠY LOCAL (đã setup xong)
═══════════════════════════════════════════════════════════════════════
Yêu cầu: MySQL chạy (Laragon, root không mật khẩu, DB `customer_crm`), Node + corepack.
LUÔN set temp về ổ D trước (ổ C gần đầy):  $env:TMP="D:\yarn-temp"

Backend (cổng 3901, Swagger http://localhost:3901/api/docs):
  cd D:\SetupC\WWW\crm\backend-nestjs
  $env:TMP="D:\yarn-temp"; corepack yarn@stable start:dev

Frontend (cổng 3900):
  cd D:\SetupC\WWW\crm\frontend
  $env:TMP="D:\yarn-temp"; corepack yarn@stable dev

Package manager: Yarn Berry v4 (qua corepack yarn@stable). nodeLinker: node-modules.
⚠ enableGlobalCache=false trong .yarnrc.yml (vì ổ C đầy → cache nằm local trên D).

Scripts backend hay dùng: start:dev | build | prisma:generate | prisma:studio | seed | test
Scripts frontend hay dùng: dev | build | start | db:studio | db:generate

CÔNG CỤ AUDIT CODE (Claude Code, trong .claude/):
  /check-code [all|be|fe|<module>]  → soát cấu trúc + logic, xuất docs/audit-report.md
  (subagent: crm-code-auditor — chỉ đọc, không sửa). Chạy Claude Code TỪ thư mục crm để nhận lệnh.

═══════════════════════════════════════════════════════════════════════
## 3. MỤC LỤC TÀI LIỆU CHI TIẾT (docs/)
═══════════════════════════════════════════════════════════════════════
  docs/01-kien-truc.md            → Kiến trúc tổng thể, luồng request, phân quyền, bootstrap
  docs/02-backend-modules.md      → TẤT CẢ module backend: endpoint + logic + gotcha
  docs/03-frontend.md             → Bản đồ route, components, lib api-client, auth FE
  docs/04-database.md             → 60+ model Prisma theo nhóm + TẤT CẢ enum (quan trọng!)
  docs/05-integrations-webhooks.md→ Pancake, ViettelPost, Casso/VietQR, SMS, Zalo, Mail, env
  docs/06-messaging-customer-care.md → Hệ thống nhắn tin/CSKH (template→campaign→gửi→log)
  docs/07-quy-tac-code.md         → QUY TẮC & CẠM BẪY khi sửa code (đọc trước khi sửa!)
  docs/08-ads-dashboard-ui.md     → UI dashboard Meta Ads (/admin/adsmeta), preset ngày, cột
  docs/09-ccm-workspace.md        → CCM workspace (/ccm/*, template Pancake-style) + Messenger inbox (tóm tắt)
  docs/audit-report.md            → Báo cáo audit + trạng thái sửa lỗi 🔴/🟡
  docs/changelog.md               → NHẬT KÝ làm việc theo phiên (đọc để biết đã làm gì gần đây)

Tài liệu nghiệp vụ gốc của repo: customer-care-technical-backlog.md (đọc khi làm CSKH).

═══════════════════════════════════════════════════════════════════════
## 4. 10 ĐIỀU PHẢI NHỚ (tóm tắt — chi tiết xem docs/07)
═══════════════════════════════════════════════════════════════════════
1.  Backend prefix toàn cục là `/api`. Mọi route trong code (vd @Controller('orders'))
    thực tế là /api/orders. Frontend gọi NEXT_PUBLIC_API_URL (mặc định .../api).
2.  Auth = JWT trong COOKIE (crm_access_token ~15ph, crm_refresh_token ~30 ngày),
    có fallback Bearer header. FE tự refresh khi 401/403. Đăng nhập bằng phone HOẶC email.
    Cookie options theo NODE_ENV (auth.controller.cookieOptions): prod secure:true/sameSite:'none';
    dev secure:false/sameSite:'lax' (FE 3900↔BE 3901 cùng site localhost). Google OAuth mang
    returnTo + referralCode qua `state` (base64url JSON).
3.  Phân quyền 2 lớp: @Roles(...) (RolesGuard) + @Permissions(...) (PermissionsGuard).
    Permission có alias (vd MESSAGING_MANAGE bao toàn bộ MESSAGING_*).
4.  ĐA CỬA HÀNG (multi-store): non-admin bị giới hạn theo store. PermissionsGuard set
    request.effectiveStoreId (ADMIN=null=tất cả; MODERATOR/STAFF=store của họ).
    Lấy qua @GetEffectiveStoreId(). LUÔN scope query theo effectiveStoreId cho non-admin.
5.  Rank KHÔNG cố định trong enum logic — tính động từ user.totalSpent qua RankConfig.
    points = floor(totalSpent/10000). Mỗi rank có discountPercent áp ở cart/order.
6.  Hoa hồng multi-level dùng closure table ReferralClosure (ancestor/descendant/depth).
    Tính khi đơn COMPLETED; huỷ khi đơn cancel/refund (CommissionLedger).
7.  Nhiều việc nền chạy bằng BullMQ (cần Redis). Redis TRỐNG ở local → queue TẮT,
    job chạy fallback inline hoặc bỏ qua. Đừng tưởng "queue hỏng".
8.  Webhook bên ngoài gọi vào: Pancake (POS), ViettelPost (vận chuyển), Casso (thanh toán
    VietQR). Đều có verify chữ ký + idempotency. Xem docs/05.
9.  Đơn VietQR có hạn 30 phút; cron mỗi phút tự CANCEL đơn quá hạn + hoàn kho + nhả voucher.
10. enum/giá trị trạng thái là NGUỒN SỰ THẬT ở prisma/schema.prisma. Trước khi so sánh
    chuỗi trạng thái, xem docs/04 để dùng đúng giá trị (vd OrderStatus có 13 giá trị).

═══════════════════════════════════════════════════════════════════════
## 5. QUY TRÌNH LÀM VIỆC ĐỀ NGHỊ (cho AI)
═══════════════════════════════════════════════════════════════════════
- Trước khi sửa 1 module: đọc mục module đó trong docs/02 (backend) hoặc docs/03 (frontend).
- Khi đụng dữ liệu/trạng thái: đối chiếu docs/04 + schema.prisma.
- Sau khi sửa: nếu thay đổi endpoint/model/enum/quy tắc → CẬP NHẬT file docs tương ứng.
- Không tự ý đổi applicationId, port, tên DB, cấu trúc thư mục mà chưa hỏi.
- Tin code hơn tin tài liệu nếu thấy mâu thuẫn — rồi sửa tài liệu cho khớp.
