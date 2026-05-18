'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ImageUpload from './ImageUpload';
import { apiClientClient } from '@/lib/apiClientClient';
import Select from '@/components/ui/Select';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  parentId?: string | null;
}

interface Size {
  id: string;
  name: string;
}

interface Color {
  id: string;
  name: string;
  hexCode?: string | null;
}

interface FormVariant {
  id: string;
  sizeId: string;
  colorId: string;
  price: string;
  stock: string;
}

interface ProductFormProps {
  categories: Category[];
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
  error: string;
  title: string;
  submitButtonText: string;
}

export default function ProductForm({
  categories = [],
  initialData,
  onSubmit,
  loading,
  error,
  title,
  submitButtonText,
}: ProductFormProps) {
  const router = useRouter();
  const [sizes, setSizes] = useState<Size[]>([]);
  const [colors, setColors] = useState<Color[]>([]);

  const [newSizeName, setNewSizeName] = useState('');
  const [newColorName, setNewColorName] = useState('');
  // const [newColorHex, setNewColorHex] = useState('');

  const getCategoryPath = (categoryId: string): string[] => {
    const path: string[] = [];
    let currentId: string | null | undefined = categoryId;

    while (currentId) {
      path.unshift(currentId);
      const cat = categories.find(c => c.id === currentId);
      currentId = cat?.parentId;
    }

    return path;
  };

  const initCategoryLevels = () => {
    if (!initialData || !initialData.categories || initialData.categories.length === 0) {
      return { categoryLevel1: '', categoryLevel2: '', categoryLevel3: '', categoryLevel4: '' };
    }

    const path = getCategoryPath(initialData.categories[0].id);
    return {
      categoryLevel1: path[0] || '',
      categoryLevel2: path[1] || '',
      categoryLevel3: path[2] || '',
      categoryLevel4: path[3] || '',
    };
  };

  const [form, setForm] = useState({
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    sku: initialData?.sku || '',
    description: initialData?.description || '',
    originalPrice: initialData?.originalPrice?.toString() || '',
    salePrice: initialData?.salePrice?.toString() || '',
    stockQuantity: initialData?.stockQuantity?.toString() || '0',
    weight: initialData?.weight?.toString() || '500',
    imageUrl: initialData?.imageUrl || '',
    ...initCategoryLevels(),
    isComboSet: initialData?.isComboSet || false,
    isGiftItem: initialData?.isGiftItem || false,
    isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
    variants: (initialData?.variants || []).map((v: any): FormVariant => ({
      id: v.id || Date.now().toString() + Math.random().toString(),
      sizeId: v.sizeId || '',
      colorId: v.colorId || '',
      price: v.price?.toString() || '',
      stock: v.stock?.toString() || '0',
    })) as FormVariant[],
  });

  useEffect(() => {
    apiClientClient.get<any[]>('/sizes').then(setSizes).catch(console.error);
    apiClientClient.get<any[]>('/colors').then(setColors).catch(console.error);
  }, []);

  const handleCreateSize = async () => {
    if (!newSizeName.trim()) return;
    try {
      const newSize = await apiClientClient.post<any>('/sizes', { name: newSizeName });
      setSizes([...sizes, newSize]);
      setNewSizeName('');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create size');
    }
  };

  const handleCreateColor = async () => {
    if (!newColorName.trim()) return;
    try {
      const newColor = await apiClientClient.post<any>('/colors', { name: newColorName });
      setColors([...colors, newColor]);
      setNewColorName('');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create color');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedCategoryId = form.categoryLevel4 || form.categoryLevel3 || form.categoryLevel2 || form.categoryLevel1;
    const categoryIds = selectedCategoryId ? [selectedCategoryId] : [];

    await onSubmit({
      name: form.name,
      slug: form.slug,
      sku: form.sku || undefined,
      description: form.description || undefined,
      imageUrl: form.imageUrl ? form.imageUrl : null,
      originalPrice: parseFloat(form.originalPrice),
      salePrice: form.salePrice ? parseFloat(form.salePrice) : undefined,
      stockQuantity: form.variants.length > 0
        ? form.variants.reduce((acc: number, v) => acc + (parseInt(v.stock) || 0), 0)
        : (parseInt(form.stockQuantity) || 0),
      weight: parseInt(form.weight) || 500,
      isComboSet: form.isComboSet,
      isGiftItem: form.isGiftItem,
      isActive: form.isActive,
      categoryIds,
      variants: form.variants.length > 0
        ? form.variants.map(v => ({
          id: v.id,
          sizeId: v.sizeId || undefined,
          colorId: v.colorId || undefined,
          price: v.price ? parseFloat(v.price) : undefined,
          stock: parseInt(v.stock) || 0,
        }))
        : undefined,
    });
  };

  const update = (field: string, value: any) => {
    setForm(prev => {
      const newForm = { ...prev, [field]: value };
      if (field === 'name' && typeof value === 'string' && !initialData) {
        newForm.slug = value
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }

      if (field === 'categoryLevel1') {
        newForm.categoryLevel2 = '';
        newForm.categoryLevel3 = '';
        newForm.categoryLevel4 = '';
      } else if (field === 'categoryLevel2') {
        newForm.categoryLevel3 = '';
        newForm.categoryLevel4 = '';
      } else if (field === 'categoryLevel3') {
        newForm.categoryLevel4 = '';
      }

      return newForm;
    });
  };

  const addVariant = () => {
    setForm(prev => ({
      ...prev,
      variants: [...prev.variants, { id: Date.now().toString(), sizeId: '', colorId: '', price: '', stock: '0' }]
    }));
  };

  const removeVariant = (id: string) => {
    setForm(prev => ({ ...prev, variants: prev.variants.filter(v => v.id !== id) }));
  };

  const updateVariant = (id: string, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      variants: prev.variants.map(v => v.id === id ? { ...v, [field]: value } : v)
    }));
  };

  const getLevel1Categories = () => categories.filter(c => !c.parentId);
  const getLevel2Categories = () => form.categoryLevel1 ? categories.filter(c => c.parentId === form.categoryLevel1) : [];
  const getLevel3Categories = () => form.categoryLevel2 ? categories.filter(c => c.parentId === form.categoryLevel2) : [];
  const getLevel4Categories = () => form.categoryLevel3 ? categories.filter(c => c.parentId === form.categoryLevel3) : [];

  return (
    <div className="py-2">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className='flex items-center gap-2'>
          <Link href="/admin/products" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        </div>
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/admin/products"
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-white font-medium transition-colors shadow-sm"
          >
            Hủy bỏ
          </Link>
          <button
            type="submit"
            form="product-form"
            className="px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={loading}
          >
            {loading && (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {submitButtonText}
          </button>
        </div>
      </div>
      <form id="product-form" onSubmit={handleSubmit}>
        <div className="flex items-stretch gap-6">
          {/* left colum */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

            <div className="p-6 md:p-8 space-y-2">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                  <span>⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="prod-name">
                    Tên sản phẩm *
                  </label>
                  <input
                    id="prod-name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                    value={form.name}
                    onChange={e => update('name', e.target.value)}
                    placeholder="VD: Áo thun basic"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="prod-sku">
                    SKU
                  </label>
                  <input
                    id="prod-sku"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm transition-all"
                    value={form.sku}
                    onChange={e => update('sku', e.target.value)}
                    placeholder="PROD-001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="prod-slug">
                  Slug *
                </label>
                <input
                  id="prod-slug"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm transition-all bg-gray-50"
                  required
                  value={form.slug}
                  onChange={e => update('slug', e.target.value)}
                  placeholder="ao-thun-basic"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="prod-price">
                    Giá gốc (VNĐ) *
                  </label>
                  <input
                    id="prod-price"
                    type="number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                    value={form.originalPrice}
                    onChange={e => update('originalPrice', e.target.value)}
                    placeholder="299000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="prod-sale">
                    Giá sale (VNĐ)
                  </label>
                  <input
                    id="prod-sale"
                    type="number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={form.salePrice}
                    onChange={e => update('salePrice', e.target.value)}
                    placeholder="249000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="prod-weight">
                    Trọng lượng (g)
                  </label>
                  <input
                    id="prod-weight"
                    type="number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={form.weight}
                    onChange={e => update('weight', e.target.value)}
                    placeholder="500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="prod-stock">
                    Tồn kho (Mặc định)
                  </label>
                  <input
                    id="prod-stock"
                    type="number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 transition-all"
                    value={form.variants.length > 0 ? form.variants.reduce((a, v) => a + (parseInt(v.stock) || 0), 0) : form.stockQuantity}
                    onChange={e => update('stockQuantity', e.target.value)}
                    placeholder="100"
                    disabled={form.variants.length > 0}
                  />
                  {form.variants.length > 0 && <p className="text-xs text-gray-500 mt-1">Tự động tính từ các biến thể</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hình ảnh sản phẩm
                </label>
                <div className="p-4 border border-gray-200 border-dashed rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                  <ImageUpload
                    value={form.imageUrl}
                    onChange={(url) => update('imageUrl', url)}
                    endpoint="productImage"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="prod-desc">
                  Mô tả chi tiết
                </label>
                <textarea
                  id="prod-desc"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  rows={5}
                  value={form.description}
                  onChange={e => update('description', e.target.value)}
                  placeholder="Viết mô tả chi tiết cho sản phẩm này..."
                />
              </div>
            </div>
          </div>

          {/* right colum */}
          <div className='flex-1 bg-white rounded-xl p-6 space-y-6 shadow-sm border border-gray-100 overflow-hidden'>
            {categories.length > 0 && (
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-4">
                  Phân loại Danh mục
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Level 1 */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Danh mục gốc</label>
                    <Select
                      className="w-full bg-white"
                      value={form.categoryLevel1}
                      onChange={(val) => update('categoryLevel1', val)}
                      placeholder="Chọn danh mục"
                      options={getLevel1Categories().map(cat => ({
                        value: cat.id,
                        label: `${cat.name}`
                      }))}
                    />
                  </div>

                  {/* Level 2 */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Danh mục Cấp 2</label>
                    <Select
                      className="w-full bg-white"
                      value={form.categoryLevel2}
                      onChange={(val) => update('categoryLevel2', val)}
                      disabled={!form.categoryLevel1}
                      placeholder="Không chọn"
                      options={getLevel2Categories().map(cat => ({
                        value: cat.id,
                        label: `${cat.name}`
                      }))}
                    />
                  </div>

                  {/* Level 3 */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Danh mục Cấp 3</label>
                    <Select
                      className="w-full bg-white"
                      value={form.categoryLevel3}
                      onChange={(val) => update('categoryLevel3', val)}
                      disabled={!form.categoryLevel2}
                      placeholder="Không chọn"
                      options={getLevel3Categories().map(cat => ({
                        value: cat.id,
                        label: `${cat.name}`
                      }))}
                    />
                  </div>

                  {/* Level 4 */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Danh mục Cấp 4</label>
                    <Select
                      className="w-full bg-white"
                      value={form.categoryLevel4}
                      onChange={(val) => update('categoryLevel4', val)}
                      disabled={!form.categoryLevel3}
                      placeholder="Không chọn"
                      options={getLevel4Categories().map(cat => ({
                        value: cat.id,
                        label: `${cat.name}`
                      }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Variants Tracking */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Biến thể sản phẩm (Size / Màu)</h3>
                  <p className="text-xs text-gray-500 mt-1">Tạo các biến thể để quản lý giá và tồn kho riêng biệt</p>
                </div>
                <button type="button" onClick={addVariant} className="text-sm bg-blue-50 text-blue-700 font-medium px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors shadow-sm">
                  + Thêm biến thể
                </button>
              </div>

              {form.variants.length > 0 && (
                <div className="overflow-x-auto mb-6 border border-gray-200 rounded-xl shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                      <tr>
                        <th className="p-4 text-left font-semibold">Kích thước</th>
                        <th className="p-4 text-left font-semibold">Màu sắc</th>
                        <th className="p-4 text-left font-semibold">Giá bán tùy chọn (VNĐ)</th>
                        <th className="p-4 text-left font-semibold">Tồn kho</th>
                        <th className="p-4 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {form.variants.map(v => (
                        <tr key={v.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-3">
                            <Select className="w-full" size="sm" value={v.sizeId} onChange={(val) => updateVariant(v.id, 'sizeId', val)} placeholder="-- Cỡ chung --" options={sizes.map(s => ({ value: s.id, label: s.name }))} />
                          </td>
                          <td className="p-3">
                            <Select className="w-full" size="sm" value={v.colorId} onChange={(val) => updateVariant(v.id, 'colorId', val)} placeholder="-- Màu chung --" options={colors.map(c => ({ value: c.id, label: c.name }))} />
                          </td>
                          <td className="p-3">
                            <input type="number" placeholder="Bỏ trống -> Giá gốc" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 transition-all" value={v.price} onChange={(e) => updateVariant(v.id, 'price', e.target.value)} />
                          </td>
                          <td className="p-3">
                            <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 transition-all" value={v.stock} onChange={(e) => updateVariant(v.id, 'stock', e.target.value)} />
                          </td>
                          <td className="p-3 text-center">
                            <button type="button" className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors" onClick={() => removeVariant(v.id)} title="Xóa">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Tạo Kích thước mới</p>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Tên Size (VD: XL)" className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 flex-1 shadow-sm" value={newSizeName} onChange={e => setNewSizeName(e.target.value)} />
                    <button type="button" onClick={handleCreateSize} className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap">Thêm</button>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Tạo Màu sắc mới</p>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Tên Màu (VD: Đen)" className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 flex-1 shadow-sm" value={newColorName} onChange={e => setNewColorName(e.target.value)} />
                    <button type="button" onClick={handleCreateColor} className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap">Thêm</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-100">
              <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={form.isComboSet}
                  onChange={e => update('isComboSet', e.target.checked)}
                />
                <div>
                  <span className="block font-medium text-gray-800">Sản phẩm Combo</span>
                  <span className="block text-xs text-gray-500">Được tạo từ nhiều sản phẩm khác</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={form.isGiftItem}
                  onChange={e => update('isGiftItem', e.target.checked)}
                />
                <div>
                  <span className="block font-medium text-gray-800">Quà tặng kèm</span>
                  <span className="block text-xs text-gray-500">Sản phẩm dùng làm quà tặng khuyến mãi</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border border-blue-200 bg-blue-50/50 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors">
                <input
                  type="checkbox"
                  className="w-5 h-5 text-blue-600 border-blue-400 rounded focus:ring-blue-500"
                  checked={form.isActive}
                  onChange={e => update('isActive', e.target.checked)}
                />
                <div>
                  <span className="block font-medium text-blue-900">Kích hoạt sản phẩm</span>
                  <span className="block text-xs text-blue-600/70">Hiển thị trên cửa hàng</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
