# hooks — React hook tự viết (data-fetch + tiện ích)
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/03.

## File / thành phần chính
- `useApi.ts` — `useApi<T>(url, {skip,onSuccess,onError})` → `{data, loading, error, refetch}`; và `useMutation<TData,TResponse>(url, method)` → `{mutate, loading, error}`. Dùng `apiClientClient` bên dưới (có auto-refresh).
- `useDebounce.ts` — `useDebounce(value, delay)`.

## Quy ước (gotcha)
- Hook = client only → file/người dùng phải có `'use client'`. Không gọi hook trong RSC.
- KHÔNG dùng SWR/React Query trong dự án — chỉ hook tự viết này + RSC. Khi cần fetch trong client, ưu tiên `useApi`/`useMutation` (đã đi qua apiClientClient, có auto-refresh) thay vì fetch trần.
- Không có Redux/Zustand — state qua server (RSC + getSession) + client cục bộ.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- Hiện chưa phát hiện vấn đề trong audit gần nhất. (Lưu ý: nhiều component KHÔNG dùng các hook này mà fetch trần → đó là vấn đề ở phía component, không phải ở hook.)
