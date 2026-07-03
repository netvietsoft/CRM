# components/admin — UI khu quản trị (bảng/biểu mẫu admin)
> Context cho AI — đọc trước khi sửa code thư mục này. Toàn cục: ../../../../first_readme.txt + docs/03.

## File / thành phần chính
- Khung: `AdminShell.tsx`, `AdminSidebar.tsx`, `AdminHeader.tsx`, `AdminNotifications.tsx` (realtime socket.io).
- Đơn hàng: `OrdersTableClient`, `OrderStatusManager`, `OrderPaymentClient`, `OrderInfoClient`, `OrderNotesClient`, `OrderReadStatusManager`, `OrderSaveProvider`, `CreateOrderModal/Button`, `DeleteOrderButton`, `OrderAdvancedFilter`, `OrderStatusFilter`, `OrderSearchInput`.
- Sản phẩm: `ProductsClient`, `ProductForm`, `ProductActions`, `ProductRowActions`, `ImageUpload`.
- Danh mục: `CategoryTree`, `CategoryActions`, `CategoryRowActions`.
- Cửa hàng/staff: `StoreProfileForm`, `StoreActions`, `StoreApprovalButton`, `StoreStatusManager`, `DeleteStoreButton`, `StaffTableClient`, `StaffActions`, `StaffAssignForm`.
- Khách hàng: `CustomersTableClient`, `CustomerActions`, `CustomerSearch`, `CustomersLoadErrorState`.
- Voucher/loyalty: `VoucherTableClient`, `VoucherActions`, `EditVoucherModal`, `OrderVouchersTableClient`, `CreateOrderVoucherButton`, `ReferralVoucher*`, `ReferralRewardConfig`, `RankConfigEditor`, `CommissionRateEdit`, `SpinPrize*`, `ExportQRButton`.
- Khác: `MasterDataManager` (materials/suppliers/units/tags), `ZaloZnsModal`, `RefreshOnMount`.
- `customer-care/` (thư mục con): các `CustomerCare*Client` cho templates/campaigns/automations/logs/settings/import/compose. Logic backend ở docs/06.

## Quy ước (gotcha)
- Đặt tên `<X>Client.tsx` cho client component (`'use client'`); list/form admin đặt ở đây (docs/07 E).
- Gọi backend qua `apiClientClient` ở client / `apiClient` ở RSC (KHÔNG fetch trần — mất auto-refresh 401/403). Base URL phải có `/api`.
- Trang admin gate role ADMIN/STAFF/MODERATOR (proxy.ts + layout). Component KHÔNG tự tin role — backend mới phân quyền thật.
- Tailwind 4 + component tự viết (không shadcn). Tái dùng `components/ui` (Select, Skeleton…). Toast: react-toastify. Không lộ secret ra client.

## ⚠️ Vấn đề đang mở (audit 2026-06-27 — chi tiết docs/audit-report.md)
- 🟡 `ProductsClient.tsx:433` — `fetch` trần thay vì `apiClientClient` → mất auto-refresh. Hướng sửa: chuyển sang `apiClientClient`.
- 🟡 `AdminNotifications.tsx:70` — `apiUrl.replace('/api','')` thay lần đầu → sai origin nếu host chứa `/api`. Hướng sửa: chỉ bỏ `/api` ở cuối chuỗi.
