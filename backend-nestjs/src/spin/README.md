# spin — Vòng quay may mắn (POINTS / VOUCHER / NONE)
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../first_readme.txt + docs/ (đặc biệt docs/02 mục SPIN).

## File chính
- `spin.controller.ts` — User: GET /spin/attempts, /prizes, /history, POST /spin. Admin: GET /spin/admin/prizes, /admin/stats, POST/PUT/DELETE /admin/prizes/:id, POST /spin/add-attempts.
- `spin.service.ts` — chọn giải theo xác suất, trao thưởng, trừ lượt quay.

## Luồng / logic quan trọng (gotcha)
- Loại giải (enum): POINTS / VOUCHER / NONE. VOUCHER → **clone voucher template** hạn 7 ngày.
- Điều kiện giải qua `PrizeCondition`: NO_CONDITION / REQUIRE_PURCHASE.
- Chọn theo **xác suất tích luỹ**. Toàn bộ trao thưởng nằm trong **`$transaction`**: trừ `spinTurns` + ghi `SpinHistory` + trao thưởng (atomic — giữ nguyên).
- Lượt quay (`spinTurn`) được cộng từ chỗ khác (vd review đơn có comment → +1 lượt).

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- 🔴 `spin.service.ts:94-105` — `probability` (Float) không validate tổng = 1 + không `orderBy`. Tổng ≠ 1 làm sai tỉ lệ trúng; thiếu orderBy → thứ tự không ổn định. **Sửa:** dùng `random * sum(probability)` hoặc validate khi tạo prize + thêm `orderBy` ổn định.
- 🟡 `spin.service.ts:148-165` — clone voucher bằng spread toàn bộ field + `as any` → vỡ khi schema thêm cột. **Sửa:** map tường minh các field cần clone.

## Quy ước khi sửa
- Giữ toàn bộ trao thưởng trong `$transaction`.
- Khi clone voucher, map field tường minh thay vì spread + `as any`.
- Endpoint admin gắn đủ guard + @Roles + @Permissions; user gắn JWT.
