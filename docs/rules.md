# 📜 QUY TẮC LẬP TRÌNH & TIÊU CHUẨN DỰ ÁN (docs/rules.md)

> **Dự án**: CRM Netvietsoft (Backend NestJS + Frontend Next.js)  
> **Nguồn**: Tổng hợp từ `Development Workspace Standard v1.1` (§2, §27, §28, §29) và quy chuẩn nội bộ dự án.  
> **Bắt buộc**: Mọi lập trình viên và AI Agent phải đọc và tuân thủ nghiêm ngặt.

---

## 1. ⚙️ QUY ĐỊNH MÔI TRƯỜNG & PORT HỆ THỐNG

1. **Port chuẩn**:
   - Backend NestJS: Cổng `3901` (REST API prefix: `/api`, Swagger: `/api/docs`).
   - Frontend Next.js: Cổng `3900`.
   - Cổng `3000`/`3001` dành riêng cho dự án khác trên máy này — **CẤM TỰ Ý ĐỔI PORT**.
2. **Cơ chế lưu tạm Yarn**:
   - Ổ C gần đầy → **BẮT BUỘC** set temp về ổ D trước khi chạy lệnh: `$env:TMP="D:\yarn-temp"`.
   - File `.yarnrc.yml` đã cấu hình `enableGlobalCache: false`.
3. **Cơ sở dữ liệu**: MySQL 8.0, Database: `customer_crm`.

---

## 2. 🏗️ QUY TẮC BACKEND (NESTJS)

### 2.1. Phân tầng & Kiến trúc
- **Tầng nghiệp vụ**: Mọi logic tính toán, xử lý dữ liệu phải nằm ở `*.service.ts`. Controller chỉ làm nhiệm vụ parse request, validate DTO và trả về response.
- **DTO Validation**: Global `ValidationPipe` đã bật `{ forbidNonWhitelisted: true, transform: true }`. Mọi trường nhận từ client phải được khai báo tường minh trong DTO kèm decorator `class-validator`.

### 2.2. Bảo mật & Phân quyền (Authentication & Authorization)
- **Endpoint Admin**: Luôn gắn `@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)` + `@Roles(...)` + `@Permissions(...)`.
- **Endpoint Public**: Luôn đánh dấu `@Public()` rõ ràng.
- **Multi-Tenant (Đa cửa hàng)**:
  - Với non-admin (MODERATOR/STAFF), **LUÔN LUÔN** trích xuất `@GetEffectiveStoreId()` và lọc `where: { storeId: effectiveStoreId }`.
  - Quên lọc `effectiveStoreId` sẽ gây lộ dữ liệu giữa các Store (Lỗ hổng IDOR).
  - ADMIN nhận `effectiveStoreId === null` (được xem toàn bộ hệ thống).

### 2.3. Toàn vẹn Dữ liệu & Tiền tệ
- **Giao dịch Database ($transaction)**: Mọi thao tác ghi nhận đơn hàng, trừ kho, cộng/trừ ví hoa hồng, áp dụng voucher đều phải bọc trong `this.prisma.$transaction(async (tx) => { ... })`.
- **Tiền tệ (VND)**: Tiền tệ là số nguyên đồng. Tính toán hoa hồng và giảm giá phải thực hiện trên giá trị hàng thực tế (`subtotal - discountAmount`), không tính hoa hồng trên phí vận chuyển (`shippingFee`).
- **Trạng thái Enum**: Luôn dùng đúng Enum được định nghĩa trong `prisma/schema.prisma` (ví dụ `OrderStatus` có 13 giá trị). Cấm so sánh chuỗi tùy tiện.

### 2.4. Queue (BullMQ) & Cron Jobs
- Không giả định Redis luôn sống ở local. Code phải có nhánh fallback inline khi Redis không khả dụng.
- Lưu ý các cron job ngầm: VietQR hủy đơn quá hạn (1 phút/lần), kiểm tra voucher (00:00), CSKH tự động (8:00/8:05/8:10), làm mới token Zalo (20h).

---

## 3. 🎨 QUY TẮC FRONTEND (NEXT.JS & REACT)

### 3.1. Truy cập Dữ liệu
- **Tuyệt đối KHÔNG truy cập Database trực tiếp từ Frontend**. Mọi dữ liệu phải đi qua Backend REST API thông qua `apiClient` (Server Components/Server Actions) hoặc `apiClientClient` (Client Components).
- **Client Components**: Đánh dấu `'use client'` ở đầu file khi sử dụng hook (`useState`, `useEffect`, `useCallback`) hoặc tương tác sự kiện (onClick, onChange).

### 3.2. Quản lý Session & API Client
- Sử dụng `apiClientClient` cho mọi request phía Client để tự động đính kèm cookie (`credentials: 'include'`) và tự động kích hoạt xoay vòng token khi nhận 401.
- Không tự ý viết hàm `fetch` trần thiếu credentials.

### 3.3. Định dạng Tiền tệ & Số liệu
- **BẮT BUỘC** dùng các hàm chuẩn trong `src/lib/format.ts`:
  - `formatNumber(x)`: `1.234.567` (chuẩn vi-VN với dấu chấm ngăn nghìn).
  - `formatVnd(x)`: `1.234.567 đ`
  - `formatVndTight(x)`: `1.234.567đ`
  - `formatVndText(x)`: `1.234.567 VND`
  - `formatVndSymbol(x)`: `1.234.567 ₫`
- **CẤM** tự viết `new Intl.NumberFormat` hoặc `toLocaleString()` cục bộ thiếu locale gây sai lệch hiển thị giữa SSR và Client.

---

## 4. 🗄️ QUY TẮC DATABASE & PRISMA (§27)

1. **Cấm tuyệt đối**:
   - `DROP TABLE`, `DROP DATABASE`, `TRUNCATE` dữ liệu production.
   - Sửa hoặc xóa migration đã chạy trên production.
2. **Quy trình thay đổi Schema**:
   - Tạo Task ID rõ ràng.
   - Viết Prisma migration (`prisma migrate dev` hoặc tạo file SQL migration kiểm soát).
   - Có kế hoạch Rollback và Backup trước khi áp dụng.
3. **Cập nhật quan hệ Referral**:
   - Khi tạo User mới có `referrerId`, bắt buộc ghi nhận vào bảng `ReferralClosure` (ancestor, descendant, depth).

---

## 5. 🔌 QUY TẮC API CONTRACTS (§28)

1. Mọi API mới hoặc sửa đổi phải có:
   - DTO Input & Validation schema.
   - Output Response schema.
   - Ghi chú Swagger `@ApiOperation`, `@ApiResponse`.
   - Error code rõ ràng.
2. Không tự ý thay đổi cấu trúc JSON response của các API đang hoạt động nếu chưa có sự đồng thuận kiến trúc.

---

## 6. 📝 QUY TẮC LOGGING & GIÁM SÁT (§29)

1. Log phải có: Timestamp, module name, severity (INFO/WARN/ERROR), request correlation ID.
2. **CẤM TUYỆT ĐỐI GHI LOG**:
   - Mật khẩu (Password, Hash).
   - Access token, Refresh token, JWT.
   - Khóa bí mật (Secret keys, Private keys, AES keys).
   - Thông tin thẻ thanh toán / OTP.

---

## 7. 🧪 QUY TẮC KIỂM THỬ & SỬA LỖI (ANTIGRAVITY LOOP)

1. **CẤM SỬA TEST ĐỂ LÀM XANH**:
   - Không được xóa test fail.
   - Không được skip/disable test.
   - Không được nới lỏng assertion để ép test pass.
2. Khi sửa bug:
   - Đọc kỹ `bug_report.json` và phân tích root cause.
   - Sửa code production tại gốc.
   - Chạy lại toàn bộ test suite để đảm bảo không bị regression.

