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
