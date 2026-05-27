export interface StoreSummary {
  id?: string;
  name: string;
  slug?: string | null;
  addressStreet?: string | null;
  addressWard?: string | null;
  addressProvince?: string | null;
}

export interface CategorySummary {
  id: string;
  name: string;
}

export interface ProductOption {
  name: string;
}

export interface ProductVariant {
  price?: number | null;
  size?: ProductOption | null;
  color?: ProductOption | null;
}

export interface ProductSummary {
  id: string;
  name: string;
  imageUrl?: string | null;
  salePrice?: number | null;
  originalPrice: number;
  weight?: number | null;
  isActive?: boolean;
  storeId?: string | null;
  store?: StoreSummary | null;
  categories?: CategorySummary[];
  variants?: ProductVariant[];
}

export type VoucherType = 'FIXED_AMOUNT' | 'PERCENT' | 'FREESHIP' | 'STACK';

export interface VoucherStackTier {
  conditionType?: string;
  minProducts?: number | null;
  minAmount?: number | null;
  discount: number;
  type?: string;
  maxDiscount?: number | null;
}

export interface VoucherDefinition {
  id: string;
  code: string;
  name: string;
  type: VoucherType;
  value: number;
  maxDiscount?: number | null;
  minOrderValue: number;
  requiredCategoryId?: string | null;
  minProductCount?: number | null;
  orderSources?: string[] | null;
  salesChannels?: string[] | null;
  customerSegments?: string[] | null;
  customerRanks?: string[] | null;
  customerOccasions?: string[] | null;
  shippingProvinces?: string[] | null;
  paymentMethods?: string[] | null;
  stackTiers?: VoucherStackTier[] | null;
  campaignCategory?: string | null;
  store?: StoreSummary | null;
  storeId?: string | null;
  validTo?: string | Date | null;
}

export interface UserVoucher {
  id: string;
  voucherId?: string;
  voucher: VoucherDefinition;
  isUsed: boolean;
  status: string;
  expiresAt?: string | Date | null;
  unlockAt?: string | Date | null;
  sourceOrderCode?: string | null;
}

export interface UserProfile {
  name?: string | null;
  phone?: string | null;
  addressStreet?: string | null;
  addressWard?: string | null;
  addressProvince?: string | null;
  rank?: string | null;
  dob?: string | Date | null;
  commissionBalance?: number | null;
}

export interface CartItem {
  id: string;
  product: ProductSummary;
  quantity: number;
  size: string | null;
  color: string | null;
}

export interface CartResponse {
  items: CartItem[];
}

export interface ShippingFeeResponse {
  fee?: number;
}

export interface CreateOrderResponse {
  orderId: string;
  vietqr?: unknown;
}
