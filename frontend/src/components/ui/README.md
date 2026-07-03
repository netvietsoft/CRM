# components/ui — primitive UI tái dùng (không gọi backend)
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../../first_readme.txt + docs/03.

## File / thành phần chính
- `AppImage.tsx` — wrapper `next/image` (dùng imageLoader, ảnh unoptimized + domain Google/UploadThing).
- `Select.tsx` — dropdown tự viết (không Radix/shadcn).
- `Skeleton.tsx`, `CardSkeleton.tsx`, `TableSkeleton.tsx` — placeholder loading.
- `GenericPageLoading.tsx` — màn loading dùng cho `loading.tsx`.
- `NavigationProgress.tsx`, `PageTransition.tsx` — hiệu ứng chuyển trang.

## Quy ước (gotcha)
- Component thuần trình bày — KHÔNG gọi backend, KHÔNG chứa nghiệp vụ. Nhận data qua props.
- Tailwind 4 + tự viết (không shadcn/Radix). Trước khi tạo primitive mới → kiểm tra ở đây để tái dùng (docs/07 C.6).
- Có tương tác/state → `'use client'`; thuần hiển thị → để RSC. Không lộ secret ra client.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- Hiện chưa phát hiện vấn đề trong audit gần nhất.
