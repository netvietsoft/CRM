# lib — tiện ích lõi FE (API client, auth, jwt, helpers)
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/03.

## File / thành phần chính
- `apiClient.ts` — fetch SERVER-side (RSC/Server Action): đọc cookie `crm_access_token` qua `await cookies()` → gắn Bearer. Base = `NEXT_PUBLIC_API_URL`. Có `get/post/patch/delete` + `ApiError`.
- `apiClientClient.ts` — fetch CLIENT-side: `credentials:'include'` + tự refresh qua `POST /auth/refresh` khi 401/403 (dedupe promise tránh race). MỌI gọi backend từ client PHẢI dùng file này.
- `auth.ts` — `getSession()` (Server Action gọi `GET /users/me`), type `SessionUser`, `generateReferralCode()`.
- `jwt.ts` — `verifyToken()` dùng `jsonwebtoken` (chỉ cho middleware uploadthing, chạy server). KHÔNG dùng cho proxy.ts (Edge).
- `api-config.ts` — `API_URL`, `IS_EXTERNAL_API`.
- `apiError.ts` — class `ApiError`.
- `membership.ts` — tính rank/badge/bậc. `referral-client.ts` — tiện ích referral phía client.
- `mailer.ts` / `adminMessaging.ts` / `support.ts` — email + thông báo.
- `imageLoader.ts` — loader cho `next/image`. `spreadsheet.ts` — export docx. `uploadthing.ts` — helper UploadThing.
- `format.ts` — **NGUỒN DUY NHẤT** định dạng số kiểu VN (locale `vi-VN`, dấu CHẤM ngăn nghìn). Xuất: `formatNumber` (`1.234.567`), `formatVnd` (`… đ`), `formatVndTight` (`…đ`), `formatVndText` (`… VND`), `formatVndSymbol` (`… ₫`), `formatCompact` (`1,2 N`). MỌI hiển thị số/tiền PHẢI import từ đây — KHÔNG tự viết `Intl.NumberFormat` cục bộ.

## Quy ước (gotcha)
- Phân biệt RSC vs `'use client'`: `apiClient` CHỈ chạy server (đọc cookie); `apiClientClient` CHỈ chạy client.
- Gọi backend qua apiClient/apiClientClient — KHÔNG `fetch` trần (mất auto-refresh 401/403).
- Base URL backend PHẢI có `/api` (xem docs/03). KHÔNG lộ secret (JWT_SECRET, API key…) ra client — chỉ đọc trong code server.
- Đừng tự viết lại vòng refresh token — đã có sẵn trong `apiClientClient`.
- Middleware đang chạy là `src/proxy.ts` (Next 16 đổi `middleware.ts`→`proxy.ts`) — refresh token + gating route. Đang TRÙNG cơ chế refresh với `apiClientClient` (audit #12).

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- 🔴 `src/proxy.ts:3` — `import jwt from 'jsonwebtoken'` KHÔNG an toàn trên Edge runtime + trùng cơ chế refresh với apiClientClient/layout. Hướng sửa: chốt 1 cơ chế; nếu giữ proxy.ts → đổi sang `jose`/decode thủ công + cập nhật docs.
- 🟡 `lib/jwt.ts:3` — fallback secret `'dev-secret-change-me'`; upload hỏng (verify sai) nếu thiếu `JWT_SECRET`. Hướng sửa: bắt buộc env, không fallback ở production.
- 🟡 `lib/api-config.ts:7,12-13` — base mặc định `/api` khác `apiClient` (gây lệch) + còn `console.log` rác. Hướng sửa: thống nhất base, bỏ log.
