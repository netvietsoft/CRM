import { useState, type ChangeEvent, type SVGProps } from 'react';
import type { OrderItem, Product } from './createOrder.types';
import { formatVnd, formatNumber } from '@/lib/format';

export function fmtDate(value: string | Date) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatCurrency(amount: number) {
  return formatVnd(amount);
}

export function formatNumberValue(value: number) {
  return value ? formatNumber(value) : '';
}

export function formatDateInputValue(value?: string | null) {
  if (!value) {
    return '';
  }

  const matchedDate = value.match(/^\d{4}-\d{2}-\d{2}/);
  if (matchedDate) {
    return matchedDate[0];
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return parsedDate.toISOString().slice(0, 10);
}

export function NumberInput({
  value,
  onChange,
  placeholder = '0',
  className = '',
}: {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const displayValue = draft ?? formatNumberValue(value);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value.replace(/[^0-9]/g, '');
    if (!raw) {
      setDraft('');
      onChange(0);
      return;
    }

    const nextValue = parseInt(raw, 10);
    setDraft(formatNumber(nextValue));
    onChange(nextValue);
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onBlur={() => setDraft(null)}
      placeholder={placeholder}
      className={`w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-right font-mono text-sm text-black focus:ring-1 focus:ring-blue-500 outline-none focus:bg-white transition-colors ${className}`.trim()}
    />
  );
}

export function getAvailableSizes(product: Product) {
  return Array.from(
    new Set(product.variants.map((variant) => variant.size?.name).filter(Boolean)),
  ) as string[];
}

export function getAvailableColors(product: Product) {
  return Array.from(
    new Set(product.variants.map((variant) => variant.color?.name).filter(Boolean)),
  ) as string[];
}

export function getCatalogUnitPrice(
  product: Product,
  size: string | null,
  color: string | null,
) {
  const match = product.variants.find((variant) => {
    const sameSize = (variant.size?.name || null) === size;
    const sameColor = (variant.color?.name || null) === color;
    return sameSize && sameColor;
  });

  if (match?.price !== null && match?.price !== undefined) {
    return match.price;
  }

  return product.salePrice ?? product.originalPrice;
}

export function getUnitPrice(item: OrderItem) {
  if (item.isCustomPrice) {
    return item.unitPrice;
  }

  return getCatalogUnitPrice(item.product, item.size, item.color);
}

export function buildOrderItem(product: Product): OrderItem {
  return {
    productId: product.id,
    quantity: 1,
    size: null,
    color: null,
    product,
    unitPrice: getCatalogUnitPrice(product, null, null),
    isCustomPrice: false,
  };
}

export function syncOrderItemPricing(
  item: OrderItem,
  next: Partial<Pick<OrderItem, 'quantity' | 'size' | 'color'>>,
): OrderItem {
  const updatedItem = { ...item, ...next };

  if (updatedItem.isCustomPrice) {
    return updatedItem;
  }

  return {
    ...updatedItem,
    unitPrice: getCatalogUnitPrice(updatedItem.product, updatedItem.size, updatedItem.color),
  };
}

export function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
