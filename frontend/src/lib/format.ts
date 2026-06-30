// Nguồn DUY NHẤT cho định dạng số kiểu Việt Nam — phân tách hàng nghìn bằng dấu CHẤM.
// Mọi component nên import từ đây thay vì tự tạo Intl.NumberFormat cục bộ.

const n0 = (n: number | null | undefined): number => Number(n) || 0;

// Chỉ nhóm hàng nghìn.            1234567 -> "1.234.567"
export const formatNumber = (n: number | null | undefined): string =>
  new Intl.NumberFormat('vi-VN').format(n0(n));

// Tiền VND, hậu tố " đ" (có khoảng trắng).   1234567 -> "1.234.567 đ"
export const formatVnd = (n: number | null | undefined): string => `${formatNumber(n)} đ`;

// Tiền VND, hậu tố "đ" sát số (không khoảng trắng).   1234567 -> "1.234.567đ"
export const formatVndTight = (n: number | null | undefined): string => `${formatNumber(n)}đ`;

// Tiền VND, hậu tố " VND".   1234567 -> "1.234.567 VND"
export const formatVndText = (n: number | null | undefined): string => `${formatNumber(n)} VND`;

// Tiền VND theo ký hiệu ₫ (Intl currency).   1234567 -> "1.234.567 ₫"
export const formatVndSymbol = (n: number | null | undefined): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n0(n));

// Rút gọn (compact).   1234567 -> "1,2 Tr"
export const formatCompact = (n: number | null | undefined): string =>
  new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(n0(n));
