import type {
  ProductSummary,
  StoreSummary,
  UserProfile,
  UserVoucher,
  VoucherDefinition,
} from '@/types/commerce';

export interface CheckoutOrderItem {
  cartItemId?: string;
  product: ProductSummary;
  quantity: number;
  size: string | null;
  color: string | null;
  price: number;
}

export interface CheckoutClientProps {
  user: UserProfile;
  items: CheckoutOrderItem[];
  store: StoreSummary | null;
  cartMode: boolean;
}

export type CheckoutVoucher = VoucherDefinition;
export type CheckoutUserVoucher = UserVoucher;
