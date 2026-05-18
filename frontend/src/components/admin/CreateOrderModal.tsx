'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Trash2, X } from 'lucide-react';
import { apiClientClient } from '@/lib/apiClientClient';
import Select from '@/components/ui/Select';

interface ProductVariant {
  id: string;
  price: number | null;
  stock: number;
  size?: { name: string } | null;
  color?: { name: string } | null;
}

interface Product {
  id: string;
  name: string;
  imageUrl: string | null;
  originalPrice: number;
  salePrice: number | null;
  stockQuantity: number;
  variants: ProductVariant[];
}

interface Customer {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
}

interface OrderItem {
  productId: string;
  quantity: number;
  size: string | null;
  color: string | null;
  product: Product;
}

interface CreateOrderModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getAvailableSizes(product: Product) {
  return Array.from(
    new Set(product.variants.map((variant) => variant.size?.name).filter(Boolean)),
  ) as string[];
}

function getAvailableColors(product: Product) {
  return Array.from(
    new Set(product.variants.map((variant) => variant.color?.name).filter(Boolean)),
  ) as string[];
}

function getUnitPrice(item: OrderItem) {
  const match = item.product.variants.find((variant) => {
    const sameSize = (variant.size?.name || null) === (item.size || null);
    const sameColor = (variant.color?.name || null) === (item.color || null);
    return sameSize && sameColor;
  });

  if (match?.price !== null && match?.price !== undefined) {
    return match.price;
  }

  return item.product.salePrice || item.product.originalPrice;
}

export default function CreateOrderModal({
  onClose,
  onSuccess,
}: CreateOrderModalProps) {
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchingCustomers, setSearchingCustomers] = useState(false);

  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const [shippingName, setShippingName] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingStreet, setShippingStreet] = useState('');
  const [shippingWard, setShippingWard] = useState('');
  const [shippingProvince, setShippingProvince] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [shippingFee, setShippingFee] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedCustomer) return;
    setShippingName(selectedCustomer.name || '');
    setShippingPhone(selectedCustomer.phone || '');
  }, [selectedCustomer]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!customerSearch || customerSearch.trim().length < 2) {
        setCustomers([]);
        return;
      }

      setSearchingCustomers(true);
      try {
        const data = await apiClientClient.get<any>('/admin/customers', {
          params: {
            search: customerSearch.trim(),
            limit: 8,
            includeAll: true,
          },
        });
        setCustomers(data.customers || []);
      } catch (err) {
        console.error('Customer search failed', err);
      } finally {
        setSearchingCustomers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerSearch]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!productSearch || productSearch.trim().length < 2) {
        setProducts([]);
        return;
      }

      setSearchingProducts(true);
      try {
        const data = await apiClientClient.get<any>('/products/admin', {
          params: {
            search: productSearch.trim(),
            limit: 8,
          },
        });
        setProducts(data.data || []);
      } catch (err) {
        console.error('Product search failed', err);
      } finally {
        setSearchingProducts(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [productSearch]);

  const addProduct = (product: Product) => {
    setOrderItems((current) => [
      ...current,
      {
        productId: product.id,
        quantity: 1,
        size: null,
        color: null,
        product,
      },
    ]);
    setProductSearch('');
    setProducts([]);
  };

  const updateOrderItem = (
    index: number,
    next: Partial<Pick<OrderItem, 'quantity' | 'size' | 'color'>>,
  ) => {
    setOrderItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
            ...item,
            ...next,
          }
          : item,
      ),
    );
  };

  const removeOrderItem = (index: number) => {
    setOrderItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const subtotal = orderItems.reduce(
    (sum, item) => sum + getUnitPrice(item) * item.quantity,
    0,
  );
  const total = Math.max(0, subtotal + shippingFee - discountAmount);

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      setError('Vui long chon khach hang');
      return;
    }

    if (orderItems.length === 0) {
      setError('Vui long them it nhat 1 san pham');
      return;
    }

    if (!shippingName || !shippingPhone) {
      setError('Vui long nhap thong tin giao hang');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await apiClientClient.post('/orders/admin', {
        userId: selectedCustomer.id,
        items: orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          size: item.size || undefined,
          color: item.color || undefined,
        })),
        shippingName,
        shippingPhone,
        shippingStreet,
        shippingWard,
        shippingProvince,
        customerNote,
        adminNote,
        shippingFee,
        discountAmount,
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong the tao don hang');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center">
      <div className="w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-xl border border-gray-200 flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Tạo Đơn</h2>
            <p className="text-sm text-gray-500 mt-1">Nhập Thông Tin</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <section className="rounded-2xl border border-gray-200 bg-white">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Khách Hàng</h3>
                </div>
                <div className="p-5 space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Tim theo ten, so dien thoai, email"
                      className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {selectedCustomer && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedCustomer.name || selectedCustomer.phone || 'Khách Hàng'}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {selectedCustomer.phone || 'Chưa có số điện thoại'}
                          {selectedCustomer.email ? ` • ${selectedCustomer.email}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(null)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {!selectedCustomer && searchingCustomers && (
                    <div className="text-sm text-gray-500">Đang tìm khách hàng...</div>
                  )}

                  {!selectedCustomer && customers.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {customers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => setSelectedCustomer(customer)}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left hover:border-blue-500 hover:bg-blue-50 transition-colors"
                        >
                          <p className="text-sm font-medium text-gray-900">
                            {customer.name || customer.phone || 'Khách Hàng'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {customer.phone || 'Chưa có số điện thoại'}
                            {customer.email ? ` • ${customer.email}` : ''}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Sản Phẩm</h3>
                </div>
                <div className="p-5 space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Tim san pham"
                      className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {searchingProducts && (
                    <div className="text-sm text-gray-500">Đang tìm sản phẩm...</div>
                  )}

                  {products.length > 0 && (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {products.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => addProduct(product)}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center gap-3"
                        >
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                              <Plus className="w-4 h-4" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatCurrency(product.salePrice || product.originalPrice)} • Ton {product.stockQuantity}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {orderItems.length > 0 && (
                    <div className="border-t border-gray-100 pt-4 space-y-3">
                      {orderItems.map((item, index) => {
                        const sizes = getAvailableSizes(item.product);
                        const colors = getAvailableColors(item.product);
                        const unitPrice = getUnitPrice(item);

                        return (
                          <div key={`${item.productId}-${index}`} className="rounded-xl border border-gray-200 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 space-y-3">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Don gia {formatCurrency(unitPrice)}
                                  </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">So luong</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={item.quantity}
                                      onChange={(e) =>
                                        updateOrderItem(index, {
                                          quantity: Math.max(1, Number(e.target.value) || 1),
                                        })
                                      }
                                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>

                                  {sizes.length > 0 && (
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Size</label>
                                      <Select
                                        value={item.size || ''}
                                        onChange={(val) =>
                                          updateOrderItem(index, {
                                            size: val || null,
                                          })
                                        }
                                        className="w-full"
                                        options={[
                                          { value: '', label: 'Chọn size' },
                                          ...sizes.map((size) => ({ value: size, label: size }))
                                        ]}
                                      />
                                    </div>
                                  )}

                                  {colors.length > 0 && (
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Màu</label>
                                      <Select
                                        value={item.color || ''}
                                        onChange={(val) =>
                                          updateOrderItem(index, {
                                            color: val || null,
                                          })
                                        }
                                        className="w-full"
                                        options={[
                                          { value: '', label: 'Chọn màu' },
                                          ...colors.map((color) => ({ value: color, label: color }))
                                        ]}
                                      />
                                    </div>
                                  )}
                                </div>

                                <div className="text-sm font-medium text-gray-900">
                                  Thanh tien {formatCurrency(unitPrice * item.quantity)}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => removeOrderItem(index)}
                                className="w-9 h-9 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-2xl border border-gray-200 bg-white">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Giao Hàng</h3>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tên Người Nhận</label>
                    <input
                      value={shippingName}
                      onChange={(e) => setShippingName(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Số Điện Thoại</label>
                    <input
                      value={shippingPhone}
                      onChange={(e) => setShippingPhone(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Địa Chỉ</label>
                    <input
                      value={shippingStreet}
                      onChange={(e) => setShippingStreet(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Phường /xã</label>
                      <input
                        value={shippingWard}
                        onChange={(e) => setShippingWard(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Tỉnh thành</label>
                      <input
                        value={shippingProvince}
                        onChange={(e) => setShippingProvince(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú khách hàng</label>
                    <textarea
                      value={customerNote}
                      onChange={(e) => setCustomerNote(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú nội bộ</label>
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Phí ship</label>
                      <input
                        type="number"
                        min="0"
                        value={shippingFee}
                        onChange={(e) => setShippingFee(Number(e.target.value) || 0)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Giảm giá</label>
                      <input
                        type="number"
                        min="0"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Tổng đơn hàng</h3>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Tạm Tính</span>
                    <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Phí ship</span>
                    <span className="font-medium text-gray-900">{formatCurrency(shippingFee)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Giảm giá</span>
                    <span className="font-medium text-red-600">-{formatCurrency(discountAmount)}</span>
                  </div>
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">Tổng cộng</span>
                    <span className="text-xl font-semibold text-gray-900">{formatCurrency(total)}</span>
                  </div>

                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || !selectedCustomer || orderItems.length === 0}
                    className="w-full rounded-xl bg-blue-600 text-white py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Đang tạo...' : 'Tạo đơn hàng'}
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
