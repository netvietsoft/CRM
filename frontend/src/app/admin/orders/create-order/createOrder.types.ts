export interface ProductVariant {
  id: string;
  price: number | null;
  stock: number;
  size?: { name: string } | null;
  color?: { name: string } | null;
}

export interface Product {
  id: string;
  name: string;
  imageUrl: string | null;
  originalPrice: number;
  salePrice: number | null;
  stockQuantity: number;
  variants: ProductVariant[];
}

export interface AddressOption {
  code: string;
  name: string;
}

export interface StaffMember {
  id: string;
  name?: string | null;
  phone?: string | null;
}

export interface Customer {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  gender?: string | null;
  dob?: string | null;
  addressStreet?: string | null;
  addressWard?: string | null;
  addressProvince?: string | null;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  size: string | null;
  color: string | null;
  product: Product;
  unitPrice: number;
  isCustomPrice: boolean;
}

export interface StaffMembersResponse {
  staff?: StaffMember[];
}

export interface CustomerSearchResponse {
  customers?: Customer[];
}

export interface ProductSearchResponse {
  data?: Product[];
}

export interface CustomerPrefill {
  shippingName: string;
  shippingPhone: string;
  shippingStreet: string;
  shippingProvince: string;
  shippingWard: string;
  wards: AddressOption[];
  provinceOptions?: AddressOption[];
}

export interface ReasonGroup {
  label: string;
  options?: string[];
}

export interface CreateOrderCustomerDraft {
  selectedCustomer: Customer | null;
  shippingName: string;
  shippingPhone: string;
  shippingStreet: string;
  shippingWard: string;
  shippingProvince: string;
  customerEmail: string;
  customerDob: string;
  gender: string;
}
