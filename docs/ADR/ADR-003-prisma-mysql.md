# ADR-003: Lựa chọn Prisma ORM & MySQL 8.0

- **Trạng thái**: ACCEPTED
- **Ngày**: 2026-06-01
- **Người đề xuất**: Architect Agent

---

## 1. Bối cảnh (Context)
Dự án e-commerce và CRM có hơn 60 thực thể dữ liệu với nhiều mối quan hệ phức tạp (Closure Table, Many-to-Many, Biến thể sản phẩm, Sổ cái hoa hồng).

---

## 2. Quyết định (Decision)
Lựa chọn **MySQL 8.0** làm hệ quản trị cơ sở dữ liệu quan hệ và **Prisma ORM** làm tầng truy cập dữ liệu.

---

## 3. Lý do (Rationale)
1. **Type-safe Querying**: Prisma Client tự động sinh types chuẩn xác từ schema, ngăn chặn lỗi type mismatch trong quá trình phát triển.
2. **Schema DSL trực quan**: File `schema.prisma` đóng vai trò là nguồn sự thật duy nhất (Single Source of Truth) về mô hình dữ liệu.
3. **Mạnh mẽ với Transaction**: Hỗ trợ `$transaction(async (tx) => ...)` giúp đảm bảo tính nguyên tử (Atomicity) khi tạo đơn và trừ kho.

---

## 4. Tác động (Consequences)
- Không chạy `prisma migrate dev` tùy tiện trên môi trường Production để tránh xung đột migration history.
- Cần chú ý chuyển đổi các trường tiền tệ sang `Decimal` khi yêu cầu độ chính xác cao.

