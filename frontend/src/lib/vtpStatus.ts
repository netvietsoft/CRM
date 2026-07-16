// Nhãn trạng thái ViettelPost theo NHÓM CHÍNH THỨC của portal VTP
// (supperapp/get-list-status-category-code-v2 Code=1, chốt 2026-07-15).
// Lưu ý nghiệp vụ: 501 = Giao thành công (phát cho KHÁCH); 504 = Đã trả (hoàn về NGƯỜI GỬI thành công).
// 301/302/303 (đóng túi gói/chuyến thư/nhận bảng kê) không nằm trong nhóm nào của VTP → xếp vào Đang vận chuyển.
const GROUPS: Array<[string, number[]]> = [
  ['Đơn nháp', [-100]],
  ['Đã tiếp nhận', [100, 103, -108]],
  ['Đang lấy hàng', [104]],
  ['Lấy không thành công', [102]],
  ['Đã lấy hàng', [105, 200]],
  ['Đang vận chuyển', [202, 300, 301, 302, 303, 310, 320, 400]],
  ['Đang giao hàng', [500]],
  ['Chờ phát lại', [506, 507, 509]],
  ['Giao thành công', [501]],
  ['Chờ xử lý', [505]],
  ['Đã duyệt hoàn', [502, 515]],
  ['Đã trả (hoàn về shop)', [504]],
  ['Đã hủy giao', [503]],
  ['Đang chuyển hoàn', [551]],
  ['Phát tiếp', [508, 550]],
  ['Shop hủy lấy', [107]],
  ['VTP hủy lấy', [101, 201]],
  ['Đang xác minh bồi thường', [516]],
  ['Đã bồi thường', [517]],
];

export const VTP_STATUS_LABEL: Record<number, string> = {};
for (const [name, codes] of GROUPS) for (const c of codes) VTP_STATUS_LABEL[c] = name;

/** Text trạng thái (không kèm mã số): ưu tiên nhóm VTP chính thức → statusName từ webhook → 'Mã <n>'. */
export function vtpStatusLabel(status: number | null | undefined, fallback?: string | null): string {
  if (status != null && VTP_STATUS_LABEL[status]) return VTP_STATUS_LABEL[status];
  if (fallback) return fallback;
  return status != null ? `Mã ${status}` : '—';
}

/** Màu pill theo nhóm trạng thái (xanh = thành công, đỏ = hủy/hoàn, cam = tồn/chờ, xanh dương = đang xử lý). */
export function vtpStatusCls(status: number | null | undefined): string {
  if (status == null) return 'bg-[#f1f5f9] text-[#64748b]';
  if ([500, 501, 515].includes(status)) return 'bg-[#d1fae5] text-[#047857]';
  if ([101, 102, 107, 201, 502, 503, 504, 510].includes(status)) return 'bg-[#fee2e2] text-[#dc2626]';
  if ([505, 506, 507, 508, 509, 550, 551].includes(status)) return 'bg-[#ffedd5] text-[#c2410c]';
  if ([100, 103, 104, 105, 200, 202, 300, 301, 302, 303, 320, 400].includes(status)) return 'bg-[#dbeafe] text-[#1d4ed8]';
  return 'bg-[#fef3c7] text-[#92400e]';
}
