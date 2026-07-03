# address — Dữ liệu hành chính VN (tỉnh/xã) từ JSON tĩnh, cache RAM
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/ (docs/02 mục ADDRESS, docs/05 mục 7).

## File chính
- `address.controller.ts` — GET /address?type=provinces|wards&provinceCode= (Public). `type=districts` trả `[]`.
- `address.service.ts` — `getProvinces()` / `getWards()` đọc JSON tĩnh, cache RAM, sắp theo `localeCompare('vi')`.
- `data/` — JSON tĩnh `tinh_tp` / `xa_phuong` (và quan_huyen cũ).

## Luồng / logic quan trọng (gotcha)
- **districts đã bỏ từ 2025-07-01** → endpoint trả `[]` (mô hình 2 cấp tỉnh→xã). Đừng khôi phục districts trừ khi có yêu cầu.
- Dữ liệu tĩnh, cache trong RAM (đọc file 1 lần) — sửa JSON cần restart để nạp lại.
- Sắp xếp tiếng Việt bằng `localeCompare('vi')`.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- Hiện chưa phát hiện vấn đề trong audit gần nhất.

## Quy ước khi sửa
- GET phải có `@Public()`.
- Giữ districts trả `[]` (đã bỏ 2025-07-01) trừ khi có yêu cầu rõ.
- Đổi dữ liệu → sửa JSON trong `data/`, không hardcode trong code.
