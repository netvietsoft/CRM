export type MessageChannelCode =
  | 'SMS'
  | 'ZALO'
  | 'MESSENGER'
  | 'WHATSAPP'
  | 'TIKTOK'
  | 'SHOPEE';

export type MessageTemplateKind = 'PRESET' | 'CUSTOM';
export type MessagePurpose = 'MARKETING' | 'TRANSACTIONAL' | 'OTP';
export type MessageCampaignStatus =
  | 'DRAFT'
  | 'READY'
  | 'SCHEDULED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';
export type MessageScheduleStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
export type MessageLogStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'SKIPPED';
export type MessageAudienceStatus = 'PENDING' | 'QUEUED' | 'SKIPPED' | 'PROCESSED' | 'FAILED';
export type MessageAutomationExecutionStatus = 'PENDING' | 'QUEUED' | 'SENT' | 'SKIPPED' | 'FAILED';
export type MessageAutomationTriggerType =
  | 'BIRTHDAY'
  | 'ORDER_SHIPPING_STATUS'
  | 'ORDER_DELIVERED_PAID'
  | 'CUSTOMER_CREATED'
  | 'ORDER_CREATED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'ORDER_PARTIAL_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'VOUCHER_CREATED'
  | 'VOUCHER_ACTIVATED'
  | 'VOUCHER_USED'
  | 'VOUCHER_EXPIRING_3D'
  | 'VOUCHER_EXPIRED'
  | 'BIRTHDAY_TODAY'
  | 'CUSTOMER_INACTIVE_30D'
  | 'CUSTOMER_INACTIVE_60D';
export type RecipientSourceType = 'CUSTOMERS' | 'ORDERS';
export type AudiencePurchaseState = 'PURCHASED_SUCCESS' | 'PURCHASED_FAILED' | 'NOT_PURCHASED';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface MessageChannelSummary {
  id: string;
  code: MessageChannelCode;
  name: string;
  isActive: boolean;
}

export interface MessageTemplateRecord {
  id: string;
  name: string;
  kind: MessageTemplateKind;
  content: string;
  variables?: string[] | null;
  isActive: boolean;
  createdAt: string;
  channel: MessageChannelSummary;
}

export interface MessageCampaignRecord {
  id: string;
  name: string;
  status: MessageCampaignStatus;
  purpose?: MessagePurpose;
  audienceSource?: 'MANUAL' | 'FILTER' | 'IMPORT';
  messageContent?: string | null;
  scheduledAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
  channel: MessageChannelSummary;
  metadata?: Record<string, unknown> | null;
  template?: { id: string; name: string } | null;
  _count?: {
    audiences: number;
    logs: number;
    schedules: number;
  };
}

export interface MessageAudiencePreviewItem {
  recipient: string;
  recipientName?: string | null;
  userId?: string | null;
  orderId?: string | null;
  customerName?: string | null;
  phone?: string | null;
  email?: string | null;
  orderCode?: string | null;
  orderCount?: number | null;
  totalSpent?: number | null;
  totalAmount?: number | null;
  orderStatus?: string | null;
  paymentStatus?: string | null;
}

export interface MessageAudiencePreviewResponse {
  totalCount: number;
  uniqueRecipientCount?: number;
  duplicateRecipientCount?: number;
  previewCount: number;
  previewLimit: number;
  source: RecipientSourceType;
  channelCode: MessageChannelCode;
  items: MessageAudiencePreviewItem[];
}

export interface MessageCampaignAudienceRecord {
  id: string;
  recipientName?: string | null;
  recipientValue: string;
  status: MessageAudienceStatus;
  createdAt: string;
  user?: {
    id: string;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  order?: {
    id: string;
    orderCode: string;
    status?: string;
    totalAmount?: number | null;
  } | null;
  snapshotData?: Record<string, unknown> | null;
}

export interface MessageScheduleRecord {
  id: string;
  runAt: string;
  status: MessageScheduleStatus;
  createdAt: string;
  channel: MessageChannelSummary;
  campaign?: {
    id: string;
    name: string;
    status: MessageCampaignStatus;
  } | null;
}

export interface MessageAutomationRuleRecord {
  id: string;
  name: string;
  triggerType: MessageAutomationTriggerType;
  triggerConfig?: Record<string, unknown> | null;
  audienceFilter?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  isActive: boolean;
  lastRunAt?: string | null;
  createdAt: string;
  channel: MessageChannelSummary;
  template?: {
    id: string;
    name: string;
  } | null;
}

export interface MessageAutomationRuleDetailRecord extends MessageAutomationRuleRecord {
  providerConfig?: {
    id: string;
    name: string;
    providerKey: string;
  } | null;
  createdBy?: {
    id: string;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
}

export interface MessageAutomationExecutionRecord {
  id: string;
  triggerType: MessageAutomationTriggerType;
  triggerKey: string;
  status: MessageAutomationExecutionStatus;
  reason?: string | null;
  payload?: Record<string, unknown> | null;
  executedAt?: string | null;
  createdAt: string;
  user?: {
    id: string;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  order?: {
    id: string;
    orderCode: string;
    totalAmount?: number | null;
    status?: string;
  } | null;
  messageLog?: {
    id: string;
    status: MessageLogStatus;
    recipientName?: string | null;
    recipientValue: string;
    sentAt?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
  } | null;
}

export interface MessageLogRecord {
  id: string;
  recipientName?: string | null;
  recipientValue: string;
  purpose?: MessagePurpose;
  content: string;
  status: MessageLogStatus;
  providerMessageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  sentAt?: string | null;
  channel: MessageChannelSummary;
  campaign?: {
    id: string;
    name: string;
    status: MessageCampaignStatus;
  } | null;
  template?: {
    id: string;
    name: string;
  } | null;
  createdBy?: {
    id: string;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  user?: {
    id: string;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  order?: {
    id: string;
    orderCode: string;
    totalAmount?: number | null;
    status?: string;
  } | null;
  automationRule?: {
    id: string;
    name: string;
    triggerType: MessageAutomationTriggerType;
  } | null;
  metadata?: Record<string, unknown> | null;
  renderedVariables?: Record<string, string> | null;
}

export interface MessagingOperationsChannelMetric {
  channelId: string;
  channelCode: MessageChannelCode;
  channelName: string;
  totalCount: number;
  queuedCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  successRate: number;
  errorRate: number;
}

export interface MessagingOperationsDashboard {
  windowDays: number;
  totalCount: number;
  attemptedCount: number;
  queuedCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  successRate: number;
  errorRate: number;
  channelBreakdown: MessagingOperationsChannelMetric[];
}

export interface MessagingProviderHealthStatus {
  channelCode: MessageChannelCode;
  configured: boolean;
  source: 'DB' | 'ENV' | 'NONE';
  providerKey?: string;
  warnings: string[];
}

export interface MessagingOperationsHealth {
  providerStatuses: MessagingProviderHealthStatus[];
  warnings: string[];
  recentFailureCount: number;
}

export interface SmsProviderConfigRecord {
  id: string;
  name: string;
  providerKey: string;
  storeId?: string | null;
  isActive: boolean;
  isDefault: boolean;
  apiUrl: string;
  brandName: string;
  user: string;
  pass: string;
  updatedAt: string;
}

export interface SmsProviderConfigResponse {
  config: SmsProviderConfigRecord | null;
  health: MessagingProviderHealthStatus;
  scope: 'STORE' | 'GLOBAL';
}

export interface MessageCampaignDetailRecord extends MessageCampaignRecord {
  audienceSource: 'MANUAL' | 'FILTER' | 'IMPORT';
  sendMode: 'IMMEDIATE' | 'SCHEDULED';
  completedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  store?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  template?: {
    id: string;
    name: string;
    kind?: MessageTemplateKind;
  } | null;
  providerConfig?: {
    id: string;
    name: string;
    providerKey: string;
  } | null;
  audiences: MessageCampaignAudienceRecord[];
  schedules: MessageScheduleRecord[];
  logs: MessageLogRecord[];
}

export interface CustomerSearchResult {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  rank?: string | null;
}

export interface CustomerSearchResponse {
  customers: CustomerSearchResult[];
  pagination?: PaginationMeta;
}

export const customerCareTabs = [
  { href: '/admin/customer-care', label: 'Soạn và gửi tin' },
  { href: '/admin/customer-care/templates', label: 'Template' },
  { href: '/admin/customer-care/schedules', label: 'Lịch gửi' },
  { href: '/admin/customer-care/automations', label: 'Tin tự động' },
  { href: '/admin/customer-care/logs', label: 'Tin đã gửi' },
  { href: '/admin/customer-care/import', label: 'Import ngoài' },
  { href: '/admin/customer-care/settings', label: 'Cấu hình kênh gửi' },
];

export const messagingChannelOptions: Array<{
  value: MessageChannelCode;
  label: string;
  disabled?: boolean;
}> = [
  { value: 'SMS', label: 'SMS' },
  { value: 'ZALO', label: 'Zalo', disabled: true },
  { value: 'MESSENGER', label: 'Messenger', disabled: true },
  { value: 'WHATSAPP', label: 'WhatsApp', disabled: true },
  { value: 'TIKTOK', label: 'TikTok', disabled: true },
  { value: 'SHOPEE', label: 'Shopee', disabled: true },
];

export const triggerTypeOptions: Array<{ value: MessageAutomationTriggerType; label: string }> = [
  { value: 'BIRTHDAY', label: 'Sinh nhật khách hàng' },
  { value: 'ORDER_SHIPPING_STATUS', label: 'Đơn chuyển sang vận chuyển' },
  { value: 'ORDER_DELIVERED_PAID', label: 'Đơn đã nhận và thanh toán xong' },
  { value: 'CUSTOMER_CREATED', label: 'Khách hàng mới tạo' },
  { value: 'ORDER_CREATED', label: 'Đơn hàng mới tạo' },
  { value: 'ORDER_CONFIRMED', label: 'Đơn hàng xác nhận' },
  { value: 'ORDER_SHIPPED', label: 'Đơn hàng đã gửi' },
  { value: 'ORDER_DELIVERED', label: 'Đơn hàng giao thành công' },
  { value: 'ORDER_PARTIAL_DELIVERED', label: 'Đơn giao một phần' },
  { value: 'ORDER_CANCELLED', label: 'Đơn hàng bị hủy' },
  { value: 'PAYMENT_SUCCESS', label: 'Thanh toán thành công' },
  { value: 'PAYMENT_FAILED', label: 'Thanh toán thất bại' },
  { value: 'VOUCHER_CREATED', label: 'Voucher được tạo cho khách' },
  { value: 'VOUCHER_ACTIVATED', label: 'Voucher được kích hoạt' },
  { value: 'VOUCHER_USED', label: 'Voucher đã sử dụng' },
  { value: 'VOUCHER_EXPIRING_3D', label: 'Voucher sắp hết hạn 3 ngày' },
  { value: 'VOUCHER_EXPIRED', label: 'Voucher đã hết hạn' },
  { value: 'BIRTHDAY_TODAY', label: 'Đúng ngày sinh nhật' },
  { value: 'CUSTOMER_INACTIVE_30D', label: 'Khách ngủ đông 30 ngày' },
  { value: 'CUSTOMER_INACTIVE_60D', label: 'Khách ngủ đông 60 ngày' },
];

export const templateKindOptions: Array<{ value: MessageTemplateKind; label: string }> = [
  { value: 'CUSTOM', label: 'Tự soạn' },
  { value: 'PRESET', label: 'Mẫu sẵn có' },
];

export const messagePurposeOptions: Array<{ value: MessagePurpose; label: string; hint: string }> = [
  { value: 'MARKETING', label: 'Marketing', hint: 'Bị giới hạn chống spam chặt nhất' },
  { value: 'TRANSACTIONAL', label: 'Giao dịch', hint: 'Dùng cho chăm sóc hoặc thông báo nghiệp vụ' },
  { value: 'OTP', label: 'OTP', hint: 'Dành cho xác thực, thường không dùng ở màn này' },
];

export const recipientSourceOptions: Array<{ value: RecipientSourceType; label: string }> = [
  { value: 'CUSTOMERS', label: 'Khách hàng' },
  { value: 'ORDERS', label: 'Đơn hàng' },
];

export const purchaseStateOptions: Array<{ value: AudiencePurchaseState; label: string }> = [
  { value: 'PURCHASED_SUCCESS', label: 'Đã mua thành công' },
  { value: 'PURCHASED_FAILED', label: 'Mua không thành công' },
  { value: 'NOT_PURCHASED', label: 'Chưa mua' },
];

export const logStatusOptions: Array<{ value: MessageLogStatus; label: string }> = [
  { value: 'QUEUED', label: 'Đang chờ' },
  { value: 'SENT', label: 'Đã gửi' },
  { value: 'DELIVERED', label: 'Đã nhận' },
  { value: 'READ', label: 'Đã đọc' },
  { value: 'FAILED', label: 'Lỗi' },
  { value: 'SKIPPED', label: 'Bỏ qua' },
];

export const scheduleStatusOptions: Array<{ value: MessageScheduleStatus; label: string }> = [
  { value: 'PENDING', label: 'Chờ gửi' },
  { value: 'PROCESSING', label: 'Đang xử lý' },
  { value: 'COMPLETED', label: 'Hoàn tất' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'FAILED', label: 'Lỗi' },
];

export const automationExecutionStatusOptions: Array<{
  value: MessageAutomationExecutionStatus;
  label: string;
}> = [
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'QUEUED', label: 'Đã vào hàng đợi' },
  { value: 'SENT', label: 'Đã gửi' },
  { value: 'SKIPPED', label: 'Bỏ qua' },
  { value: 'FAILED', label: 'Lỗi' },
];

export function formatDateTime(value?: string | null) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatJsonInput<T>(value: T) {
  return JSON.stringify(value || {}, null, 2);
}

export function parseJsonInput<T>(value: string, fallback: T) {
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  return JSON.parse(trimmed) as T;
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function getMessagePurposeLabel(value?: MessagePurpose | null) {
  if (value === 'MARKETING') {
    return 'Marketing';
  }
  if (value === 'TRANSACTIONAL') {
    return 'Giao dịch';
  }
  if (value === 'OTP') {
    return 'OTP';
  }
  return '—';
}

export function getMessagePurposeHint(value?: MessagePurpose | null) {
  if (value === 'MARKETING') {
    return 'Có cooldown chống spam theo người nhận';
  }
  if (value === 'TRANSACTIONAL') {
    return 'Phù hợp cho nhắc đơn, CSKH, thông báo nghiệp vụ';
  }
  if (value === 'OTP') {
    return 'Dùng cho xác thực một lần';
  }
  return '';
}
