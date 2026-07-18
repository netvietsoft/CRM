// Danh mục quyền theo module (Xem/Sửa/Xoá) — dùng chung cho matrix ở /admin/staff và /ccm/settings/permissions.
// key null = ô không áp dụng cho module đó.
export interface PermModule {
  name: string;
  short: string; // nhãn cột gọn cho bảng ngang
  view: string | null;
  manage: string | null;
  del: string | null;
  note?: string;
}

export const PERM_MODULES: PermModule[] = [
  { name: 'Đơn hàng', short: 'Đơn hàng', view: 'ORDERS_VIEW', manage: 'ORDERS_MANAGE', del: 'ORDERS_DELETE' },
  { name: 'Đơn hàng — chỉ đơn mình lên', short: 'Đơn của mình', view: 'ORDERS_VIEW_OWN', manage: null, del: null, note: 'NV trực page: chỉ thấy đơn + doanh thu của mình (bỏ tick "Xem" ở hàng trên)' },
  { name: 'Sản phẩm', short: 'Sản phẩm', view: 'PRODUCTS_VIEW', manage: 'PRODUCTS_MANAGE', del: 'PRODUCTS_DELETE' },
  { name: 'Danh mục', short: 'Danh mục', view: 'CATEGORIES_VIEW', manage: 'CATEGORIES_MANAGE', del: 'CATEGORIES_DELETE' },
  { name: 'Khách hàng', short: 'Khách hàng', view: 'CUSTOMERS_VIEW', manage: 'CUSTOMERS_MANAGE', del: 'CUSTOMERS_DELETE' },
  { name: 'Voucher / Khuyến mãi', short: 'Voucher', view: 'VOUCHERS_VIEW', manage: 'VOUCHERS_MANAGE', del: 'VOUCHERS_DELETE' },
  { name: 'Tin nhắn CCM (inbox)', short: 'TN hội thoại', view: 'MESSENGER_VIEW', manage: 'MESSENGER_SEND', del: null, note: 'Sửa = được trả lời tin khách' },
  { name: 'CSKH chiến dịch', short: 'CSKH', view: 'MESSAGING_VIEW', manage: 'MESSAGING_MANAGE', del: null },
  { name: 'Tích hợp', short: 'Tích hợp', view: 'INTEGRATIONS_VIEW', manage: 'INTEGRATIONS_MANAGE', del: null },
  { name: 'Cài đặt cửa hàng', short: 'Cài đặt', view: null, manage: 'STORE_SETTINGS', del: null },
];
