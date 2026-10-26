# ADR-002: Lựa chọn Next.js 16 App Router cho Frontend Portal & Admin

- **Trạng thái**: ACCEPTED
- **Ngày**: 2026-06-01
- **Người đề xuất**: Architect Agent

---

## 1. Bối cảnh (Context)
Dự án cần một ứng dụng Web phục vụ đồng thời 2 đối tượng:
1. Khách hàng mua sắm (Portal): Cần SEO tốt, tải trang nhanh, bảo mật thông tin.
2. Quản trị viên & Nhân viên (Admin & CCM): Cần giao diện quản lý đa dạng, xử lý form phức tạp, tương tác realtime.

---

## 2. Quyết định (Decision)
Lựa chọn **Next.js 16 (App Router)** kết hợp **React 19** và **Tailwind CSS 4**.

---

## 3. Lý do (Rationale)
1. **React Server Components (RSC)**: Giảm thiểu kích thước bundle JS gửi xuống client, fetch dữ liệu server-side an toàn và bảo mật cookie session.
2. **Server Actions**: Xử lý form và mutation trực tiếp mà không cần viết quá nhiều boilerplate API client trung gian.
3. **App Router Layouts**: Cho phép lồng ghép layout riêng biệt giữa `/admin/*`, `/portal/*` và `/ccm/*`.

---

## 4. Tác động (Consequences)
- Frontend tuyệt đối không truy cập Database trực tiếp mà phải giao tiếp qua Backend NestJS API.
- Cần phân định rõ ràng giữa Server Components (mặc định) và Client Components (`'use client'`).

