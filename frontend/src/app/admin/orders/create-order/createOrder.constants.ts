import type { SelectOption } from '@/components/ui/Select';
import type { ReasonGroup } from './createOrder.types';

type TonedSelectOption = SelectOption & {
  triggerClassName?: string;
  optionClassName?: string;
};

export const CREATE_ORDER_CUSTOMER_DRAFT_KEY = 'chy-crm-admin-create-order-customer-draft';

export const REASON_GROUPS: ReasonGroup[] = [
  {
    label: 'Do người nhận',
    options: [
      'Không liên lạc được / Thuê bao / Người nhận thuê bao',
      'Sai sản phẩm / Sai COD / Giao chậm / Đơn ảo / Đổi ý / Hàng lỗi',
      'Sai địa chỉ/Đổi địa chỉ/Sai SĐT',
      'Hẹn ngày giao/Hẹn Thời gian giao/Hẹn sau/Hẹn lại ngày',
    ],
  },
  {
    label: 'Do ĐVVC',
    options: ['Giao chậm', 'Mất hàng', 'Hư hỏng'],
  },
  { label: 'Shop yêu cầu hoàn' },
  { label: 'Lý do khác' },
  { label: 'Do khách hàng' },
  { label: 'Do nhân viên' },
  { label: 'Do sản phẩm lỗi' },
  { label: 'Do đơn vị VC' },
  { label: 'Do đổi hàng' },
];

export const ALL_STATUSES: TonedSelectOption[] = [
  { value: 'PENDING', label: 'Chờ xác nhận' },
  { value: 'WAITING_FOR_GOODS', label: 'Chờ hàng' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'PACKAGING', label: 'Đang đóng hàng' },
  { value: 'WAITING_FOR_SHIPPING', label: 'Chờ vận chuyển' },
  { value: 'SHIPPED', label: 'Đã gửi hàng' },
  { value: 'DELIVERED', label: 'Đã nhận' },
  { value: 'PAYMENT_COLLECTED', label: 'Đã thu tiền' },
  { value: 'RETURNING', label: 'Đang hoàn' },
  { value: 'EXCHANGING', label: 'Đang đổi' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'REFUNDED', label: 'Hoàn trả' },
];

export const STATUS_TONE_MAP: Record<
  string,
  { triggerClassName: string; optionClassName: string }
> = {
  PENDING: {
    triggerClassName: 'bg-orange-50 text-orange-700 border-orange-200',
    optionClassName: 'bg-orange-50 text-orange-700',
  },
  WAITING_FOR_GOODS: {
    triggerClassName: 'bg-purple-50 text-purple-700 border-purple-200',
    optionClassName: 'bg-purple-50 text-purple-700',
  },
  CONFIRMED: {
    triggerClassName: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    optionClassName: 'bg-cyan-50 text-cyan-700',
  },
  PACKAGING: {
    triggerClassName: 'bg-blue-50 text-blue-700 border-blue-200',
    optionClassName: 'bg-blue-50 text-blue-700',
  },
  WAITING_FOR_SHIPPING: {
    triggerClassName: 'bg-gray-100 text-gray-700 border-gray-200',
    optionClassName: 'bg-gray-100 text-gray-700',
  },
  SHIPPED: {
    triggerClassName: 'bg-sky-50 text-sky-700 border-sky-200',
    optionClassName: 'bg-sky-50 text-sky-700',
  },
  DELIVERED: {
    triggerClassName: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    optionClassName: 'bg-emerald-50 text-emerald-700',
  },
  PAYMENT_COLLECTED: {
    triggerClassName: 'bg-green-50 text-green-700 border-green-200',
    optionClassName: 'bg-green-50 text-green-700',
  },
  RETURNING: {
    triggerClassName: 'bg-red-50 text-red-700 border-red-200',
    optionClassName: 'bg-red-50 text-red-700',
  },
  EXCHANGING: {
    triggerClassName: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    optionClassName: 'bg-yellow-50 text-yellow-700',
  },
  COMPLETED: {
    triggerClassName: 'bg-teal-50 text-teal-700 border-teal-200',
    optionClassName: 'bg-teal-50 text-teal-700',
  },
  CANCELLED: {
    triggerClassName: 'bg-rose-50 text-rose-700 border-rose-200',
    optionClassName: 'bg-rose-50 text-rose-700',
  },
  REFUNDED: {
    triggerClassName: 'bg-slate-100 text-slate-700 border-slate-200',
    optionClassName: 'bg-slate-100 text-slate-700',
  },
};

export const ORDER_STATUS_OPTIONS: TonedSelectOption[] = ALL_STATUSES.map((status) => ({
  ...status,
  ...STATUS_TONE_MAP[String(status.value)],
}));

export const DELAY_OPTIONS: TonedSelectOption[] = [
  {
    value: '',
    label: 'Chọn',
    triggerClassName: 'bg-gray-50 text-gray-500 border-gray-200',
    optionClassName: 'text-gray-600 hover:bg-gray-50',
  },
  {
    value: 'Chưa xử lý',
    label: 'Chưa xử lý',
    triggerClassName: 'bg-slate-100 text-slate-700 border-slate-200',
    optionClassName: 'bg-slate-100 text-slate-700',
  },
  {
    value: 'Đang xử lý',
    label: 'Đang xử lý',
    triggerClassName: 'bg-amber-50 text-amber-700 border-amber-200',
    optionClassName: 'bg-amber-50 text-amber-700',
  },
  {
    value: 'Đã xử lý',
    label: 'Đã xử lý',
    triggerClassName: 'bg-green-50 text-green-700 border-green-200',
    optionClassName: 'bg-green-50 text-green-700',
  },
];

export const GENDER_OPTIONS: SelectOption[] = [
  { value: '', label: 'Giới tính' },
  { value: 'MALE', label: 'Nam' },
  { value: 'FEMALE', label: 'Nữ' },
  { value: 'OTHER', label: 'Khác' },
];

export const CARRIER_OPTIONS: SelectOption[] = [
  { value: '', label: 'Đơn vị VC' },
  { value: 'VTP', label: 'ViettelPost (VTP)' },
  { value: 'GHTK', label: 'Giao hàng tiết kiệm' },
  { value: 'GHN', label: 'Giao hàng nhanh' },
];
