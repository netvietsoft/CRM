# ⏳ PENDING — Giá sản xuất (productionPrice) cho sản phẩm

> Phiên 2026-06-30. Code đã viết xong + cột DB đã thêm, **chỉ còn 1 bước thủ công**.
> Đọc kèm: `docs/changelog.md` (mục cùng ngày), `docs/02-backend-modules.md` (PRODUCTS), `docs/04-database.md` (Product).

## 🔴 VIỆC CÒN LẠI (bắt buộc, làm khi tiện restart backend)

Prisma client CHƯA được generate lại nên **field `productionPrice` chưa dùng được ở runtime**.
Nếu gọi PATCH/POST `/products` kèm `productionPrice` lúc này → lỗi
`PrismaClientValidationError: Unknown argument productionPrice`.

Nguyên nhân: lúc làm, `prisma generate` báo **EPERM** vì backend dev server (port 3901)
đang khoá file `node_modules/.prisma/client/query_engine-windows.dll.node`.

### Cách xử lý
```powershell
# 1. Dừng backend dev server (port 3901)
# 2. Trong thư mục backend:
cd D:\SetupC\WWW\crm\backend-nestjs
npx prisma generate
# 3. Chạy lại backend như bình thường (start:dev)
```
Sau khi generate xong → mở `http://localhost:3900/admin/products/<id>`, sửa "Giá sản xuất", lưu, F5 kiểm tra giá trị còn đó.

## ✅ ĐÃ LÀM XONG

### DB (đã áp vào DB thật `customer_crm`)
- Cột `products.production_price DOUBLE NULL`.
- Migration: `prisma/migrations/20260630190000_add_production_price/` (đã `migrate resolve --applied`).
- ⚠ Repo này KHÔNG chạy được `prisma migrate dev` (2 migration trùng timestamp `20260630140000` làm hỏng shadow DB). Thay đổi schema phải áp thủ công như trên.

### Backend
- `prisma/schema.prisma`: `productionPrice Float? @map("production_price")` (model Product).
- `src/products/dto/create-product.dto.ts`: thêm `productionPrice?` optional. (service spread `...productData`, không cần sửa).

### Frontend
- `components/admin/ProductForm.tsx`:
  - Thêm ô **Giá sản xuất** (giữa Giá gốc / Giá sale).
  - 3 ô giá + giá biến thể: định dạng **ngăn nghìn dấu chấm VN, không thập phân** (`type=text`, helper `formatPriceInput`/`onlyDigits`).
  - Ô **Slug thu gọn** (`max-w-xs`, text nhỏ).
- `app/admin/products/[id]/EditProductClient.tsx` + `create-product/CreateProductClient.tsx`: thêm `productionPrice` vào types.

## ❓ Chưa làm (chờ yêu cầu nếu cần)
- Chưa hiển thị `productionPrice` ở bảng danh sách SP / trang chi tiết public / báo cáo lợi nhuận.
- Chưa dùng giá sản xuất để tính lãi gộp ở đâu cả — mới chỉ là field nhập/lưu.
