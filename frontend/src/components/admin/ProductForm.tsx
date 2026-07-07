'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { apiClientClient } from '@/lib/apiClientClient';
import Select from '@/components/ui/Select';
import ImageUpload from './ImageUpload';

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

interface Supplier {
  id: string;
  name: string;
  code?: string | null;
}

interface Material {
  id: string;
  name: string;
  code?: string | null;
}

interface Unit {
  id: string;
  name: string;
  code: string;
}

interface ProductTag {
  id: string;
  name: string;
  slug: string;
}

interface ComboProductOption {
  id: string;
  name: string;
  sku?: string | null;
}

interface AdminProductsResponse {
  data: ComboProductOption[];
}

interface FormVariant {
  id: string;
  sizeId: string;
  colorId: string;
  price: string;
  stock: string;
}

interface FormComboItem {
  id: string;
  childProductId: string;
  quantity: string;
}

interface InitialCategory {
  id: string;
}

interface InitialVariant {
  id?: string | null;
  sizeId?: string | null;
  colorId?: string | null;
  price?: number | null;
  stock?: number | null;
}

interface InitialTagMap {
  tagId?: string | null;
  tag?: {
    id: string;
  } | null;
}

interface InitialComboItem {
  id?: string | null;
  childProductId?: string | null;
  quantity?: number | null;
  childProduct?: {
    id: string;
    name: string;
    sku?: string | null;
  } | null;
}

interface ProductFormInitialData {
  id?: string;
  name?: string | null;
  slug?: string | null;
  sku?: string | null;
  description?: string | null;
  originalPrice?: number | null;
  productionPrice?: number | null;
  salePrice?: number | null;
  stockQuantity?: number | null;
  weight?: number | null;
  imageUrl?: string | null;
  isComboSet?: boolean;
  isGiftItem?: boolean;
  isActive?: boolean;
  supplier?: { id: string } | null;
  material?: { id: string } | null;
  unit?: { id: string } | null;
  categories?: InitialCategory[] | null;
  tagMaps?: InitialTagMap[] | null;
  comboItems?: InitialComboItem[] | null;
  variants?: InitialVariant[] | null;
}

interface ProductSubmitVariant {
  id: string;
  sizeId?: string;
  colorId?: string;
  price?: number;
  stock: number;
}

interface ProductSubmitComboItem {
  childProductId: string;
  quantity: number;
}

interface ProductSubmitPayload {
  name: string;
  slug: string;
  sku?: string;
  description?: string;
  imageUrl: string | null;
  originalPrice: number;
  productionPrice?: number;
  salePrice?: number;
  stockQuantity: number;
  weight: number;
  isComboSet: boolean;
  isGiftItem: boolean;
  isActive: boolean;
  supplierId?: string;
  materialId?: string;
  unitId?: string;
  categoryIds: string[];
  tagIds?: string[];
  variants?: ProductSubmitVariant[];
  comboItems?: ProductSubmitComboItem[];
}

interface ProductFormState {
  name: string;
  slug: string;
  sku: string;
  description: string;
  originalPrice: string;
  productionPrice: string;
  salePrice: string;
  stockQuantity: string;
  weight: string;
  imageUrl: string;
  supplierId: string;
  materialId: string;
  unitId: string;
  categoryLevel1: string;
  categoryLevel2: string;
  categoryLevel3: string;
  categoryLevel4: string;
  tagIds: string[];
  isComboSet: boolean;
  isGiftItem: boolean;
  isActive: boolean;
  variants: FormVariant[];
  comboItems: FormComboItem[];
}

interface ProductFormProps {
  categories: Category[];
  initialData?: ProductFormInitialData;
  onSubmit: (data: ProductSubmitPayload) => Promise<void>;
  loading: boolean;
  error: string;
  title: string;
  submitButtonText: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Giá tiền VNĐ: chỉ giữ chữ số, hiển thị ngăn nghìn bằng dấu chấm (không thập phân).
const onlyDigits = (value: string) => value.replace(/\D/g, '');
const formatPriceInput = (rawDigits: string) => {
  const digits = onlyDigits(rawDigits);
  return digits ? new Intl.NumberFormat('vi-VN').format(Number(digits)) : '';
};

export default function ProductForm({
  categories = [],
  initialData,
  onSubmit,
  loading,
  error,
  title,
  submitButtonText,
}: ProductFormProps) {
  const [sizes, setSizes] = useState<Size[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [productTags, setProductTags] = useState<ProductTag[]>([]);
  const [productOptions, setProductOptions] = useState<ComboProductOption[]>([]);

  const [newSizeName, setNewSizeName] = useState('');
  const [newColorName, setNewColorName] = useState('');

  const getCategoryPath = (categoryId: string): string[] => {
    const path: string[] = [];
    let currentId: string | null | undefined = categoryId;

    while (currentId) {
      path.unshift(currentId);
      const cat = categories.find((category) => category.id === currentId);
      currentId = cat?.parentId;
    }

    return path;
  };

  const initCategoryLevels = () => {
    if (!initialData?.categories?.length) {
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

  const [form, setForm] = useState<ProductFormState>(() => ({
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    sku: initialData?.sku || '',
    description: initialData?.description || '',
    originalPrice: initialData?.originalPrice?.toString() || '',
    productionPrice: initialData?.productionPrice?.toString() || '',
    salePrice: initialData?.salePrice?.toString() || '',
    stockQuantity: initialData?.stockQuantity?.toString() || '0',
    weight: initialData?.weight?.toString() || '500',
    imageUrl: initialData?.imageUrl || '',
    supplierId: initialData?.supplier?.id || '',
    materialId: initialData?.material?.id || '',
    unitId: initialData?.unit?.id || '',
    ...initCategoryLevels(),
    tagIds: (initialData?.tagMaps || []).map((item) => item.tag?.id || item.tagId || '').filter(Boolean),
    isComboSet: initialData?.isComboSet || false,
    isGiftItem: initialData?.isGiftItem || false,
    isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
    variants: (initialData?.variants || []).map((variant, index): FormVariant => ({
      id: variant.id || `variant-${index}`,
      sizeId: variant.sizeId || '',
      colorId: variant.colorId || '',
      price: variant.price?.toString() || '',
      stock: variant.stock?.toString() || '0',
    })),
    comboItems: (initialData?.comboItems || []).map((item, index) => ({
      id: item.id || `combo-${index}`,
      childProductId: item.childProductId || item.childProduct?.id || '',
      quantity: item.quantity?.toString() || '1',
    })),
  }));

  useEffect(() => {
    Promise.all([
      apiClientClient.get<Size[]>('/sizes'),
      apiClientClient.get<Color[]>('/colors'),
      apiClientClient.get<Supplier[]>('/suppliers'),
      apiClientClient.get<Material[]>('/materials'),
      apiClientClient.get<Unit[]>('/units'),
      apiClientClient.get<ProductTag[]>('/product-tags'),
      apiClientClient.get<AdminProductsResponse>('/products/admin', { params: { limit: 1000 } }),
    ])
      .then(([sizesRes, colorsRes, suppliersRes, materialsRes, unitsRes, tagsRes, productsRes]) => {
        setSizes(sizesRes);
        setColors(colorsRes);
        setSuppliers(suppliersRes);
        setMaterials(materialsRes);
        setUnits(unitsRes);
        setProductTags(tagsRes);
        setProductOptions((productsRes.data || []).filter((product) => product.id !== initialData?.id));
      })
      .catch(console.error);
  }, [initialData?.id]);

  const handleCreateSize = async () => {
    if (!newSizeName.trim()) return;
    try {
      const newSize = await apiClientClient.post<Size, { name: string }>('/sizes', { name: newSizeName });
      setSizes((prev) => [...prev, newSize]);
      setNewSizeName('');
    } catch (fetchError: unknown) {
      alert(getErrorMessage(fetchError, 'Failed to create size'));
    }
  };

  const handleCreateColor = async () => {
    if (!newColorName.trim()) return;
    try {
      const newColor = await apiClientClient.post<Color, { name: string }>('/colors', { name: newColorName });
      setColors((prev) => [...prev, newColor]);
      setNewColorName('');
    } catch (fetchError: unknown) {
      alert(getErrorMessage(fetchError, 'Failed to create color'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedCategoryId =
      form.categoryLevel4 || form.categoryLevel3 || form.categoryLevel2 || form.categoryLevel1;
    const categoryIds = selectedCategoryId ? [selectedCategoryId] : [];

    await onSubmit({
      name: form.name,
      slug: form.slug,
      sku: form.sku || undefined,
      description: form.description || undefined,
      imageUrl: form.imageUrl || null,
      originalPrice: parseFloat(form.originalPrice),
      productionPrice: form.productionPrice ? parseFloat(form.productionPrice) : undefined,
      salePrice: form.salePrice ? parseFloat(form.salePrice) : undefined,
      stockQuantity: parseInt(form.stockQuantity, 10) || 0,
      weight: parseInt(form.weight, 10) || 500,
      isComboSet: form.isComboSet,
      isGiftItem: form.isGiftItem,
      isActive: form.isActive,
      supplierId: form.supplierId || undefined,
      materialId: form.materialId || undefined,
      unitId: form.unitId || undefined,
      categoryIds,
      tagIds: form.tagIds.length > 0 ? form.tagIds : undefined,
      variants:
        form.variants.length > 0
          ? form.variants.map((variant) => ({
              id: variant.id,
              sizeId: variant.sizeId || undefined,
              colorId: variant.colorId || undefined,
              price: variant.price ? parseFloat(variant.price) : undefined,
              stock: parseInt(variant.stock, 10) || 0,
            }))
          : undefined,
      comboItems:
        form.isComboSet && form.comboItems.length > 0
          ? form.comboItems
              .filter((item) => item.childProductId)
              .map((item) => ({
                childProductId: item.childProductId,
                quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
              }))
          : undefined,
    });
  };

  const update = <K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'name' && typeof value === 'string' && !initialData) {
        next.slug = slugify(value);
      }
      if (field === 'categoryLevel1') {
        next.categoryLevel2 = '';
        next.categoryLevel3 = '';
        next.categoryLevel4 = '';
      } else if (field === 'categoryLevel2') {
        next.categoryLevel3 = '';
        next.categoryLevel4 = '';
      } else if (field === 'categoryLevel3') {
        next.categoryLevel4 = '';
      }
      return next;
    });
  };

  const toggleTag = (tagId: string) => {
    setForm((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  const addVariant = () => {
    setForm((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        { id: `variant-${prev.variants.length}`, sizeId: '', colorId: '', price: '', stock: '0' },
      ],
    }));
  };

  const removeVariant = (id: string) => {
    setForm((prev) => ({ ...prev, variants: prev.variants.filter((variant) => variant.id !== id) }));
  };

  const updateVariant = (id: string, field: keyof FormVariant, value: string) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((variant) =>
        variant.id === id ? { ...variant, [field]: value } : variant,
      ),
    }));
  };

  const addComboItem = () => {
    setForm((prev) => ({
      ...prev,
      comboItems: [
        ...prev.comboItems,
        { id: `combo-${prev.comboItems.length}`, childProductId: '', quantity: '1' },
      ],
    }));
  };

  const removeComboItem = (id: string) => {
    setForm((prev) => ({ ...prev, comboItems: prev.comboItems.filter((item) => item.id !== id) }));
  };

  const updateComboItem = (id: string, field: keyof FormComboItem, value: string) => {
    setForm((prev) => ({
      ...prev,
      comboItems: prev.comboItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const getLevel1Categories = () => categories.filter((category) => !category.parentId);
  const getLevel2Categories = () =>
    form.categoryLevel1 ? categories.filter((category) => category.parentId === form.categoryLevel1) : [];
  const getLevel3Categories = () =>
    form.categoryLevel2 ? categories.filter((category) => category.parentId === form.categoryLevel2) : [];
  const getLevel4Categories = () =>
    form.categoryLevel3 ? categories.filter((category) => category.parentId === form.categoryLevel3) : [];

  const comboOptions = productOptions.map((product) => ({
    value: product.id,
    label: product.sku ? `${product.name} (${product.sku})` : product.name,
  }));

  return (
    <div className="py-2">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link href="/admin/products" className="rounded-full p-2 transition-colors hover:bg-[#f3f4f6]">
            <ArrowLeft className="h-5 w-5 text-[#6b7280]" />
          </Link>
          <h1 className="text-[24px] font-extrabold tracking-[-0.4px] text-[#111827]">{title}</h1>
        </div>
        <div className="flex items-center justify-end gap-2.5">
          <Link
            href="/admin/products"
            className="rounded-[10px] border border-[#e5e7eb] bg-white px-4 py-[9px] text-[13px] font-semibold text-[#374151] transition-colors hover:bg-[#f9fafb]"
          >
            Hủy bỏ
          </Link>
          <button
            type="submit"
            form="product-form"
            className="flex items-center gap-2 rounded-[10px] bg-[#2563eb] px-6 py-[9px] text-[13px] font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
          >
            {loading && (
              <svg className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            )}
            {submitButtonText}
          </button>
        </div>
      </div>

      <form id="product-form" onSubmit={handleSubmit}>
        <div className="flex items-stretch gap-6">
          <div className="flex-1 overflow-hidden rounded-[14px] border border-[#eceef2] bg-white">
            <div className="space-y-6 p-6 md:p-8">
              {error && (
                <div className="flex items-center gap-2 rounded-[10px] border border-[#dc2626] bg-[#fee2e2] px-4 py-3 text-[13px] text-[#dc2626] ring-4 ring-[rgba(220,38,38,0.12)]">
                  <span>⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[13px] font-semibold text-[#374151]" htmlFor="prod-name">
                    Tên sản phẩm *
                  </label>
                  <input
                    id="prod-name"
                    className="w-full rounded-[10px] border border-[#e5e7eb] px-3.5 py-2 text-[13px] outline-none transition-all focus:border-[#2563eb] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.12)]"
                    required
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="VD: Áo thun basic"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-semibold text-[#374151]" htmlFor="prod-sku">
                    SKU
                  </label>
                  <input
                    id="prod-sku"
                    className="w-full rounded-[10px] border border-[#e5e7eb] px-3.5 py-2 font-mono text-[13px] outline-none transition-all focus:border-[#2563eb] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.12)]"
                    value={form.sku}
                    onChange={(e) => update('sku', e.target.value)}
                    placeholder="PROD-001"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#9ca3af]" htmlFor="prod-slug">
                  Slug *
                </label>
                <input
                  id="prod-slug"
                  className="w-full max-w-xs rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-3 py-1.5 font-mono text-[11px] text-[#6b7280] outline-none transition-all focus:border-[#2563eb] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.12)]"
                  required
                  value={form.slug}
                  onChange={(e) => update('slug', e.target.value)}
                  placeholder="ao-thun-basic"
                />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[13px] font-semibold text-[#374151]" htmlFor="prod-production">
                    Giá sản xuất (VNĐ)
                  </label>
                  <input
                    id="prod-production"
                    type="text"
                    inputMode="numeric"
                    className="w-full rounded-[10px] border border-[#e5e7eb] px-3.5 py-2 text-right text-[13px] outline-none transition-all focus:border-[#2563eb] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.12)]"
                    value={formatPriceInput(form.productionPrice)}
                    onChange={(e) => update('productionPrice', onlyDigits(e.target.value))}
                    placeholder="150.000"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-semibold text-[#374151]" htmlFor="prod-price">
                    Giá gốc (VNĐ) *
                  </label>
                  <input
                    id="prod-price"
                    type="text"
                    inputMode="numeric"
                    className="w-full rounded-[10px] border border-[#e5e7eb] px-3.5 py-2 text-right text-[13px] outline-none transition-all focus:border-[#2563eb] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.12)]"
                    required
                    value={formatPriceInput(form.originalPrice)}
                    onChange={(e) => update('originalPrice', onlyDigits(e.target.value))}
                    placeholder="299.000"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-semibold text-[#374151]" htmlFor="prod-sale">
                    Giá sale (VNĐ)
                  </label>
                  <input
                    id="prod-sale"
                    type="text"
                    inputMode="numeric"
                    className="w-full rounded-[10px] border border-[#e5e7eb] px-3.5 py-2 text-right text-[13px] outline-none transition-all focus:border-[#2563eb] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.12)]"
                    value={formatPriceInput(form.salePrice)}
                    onChange={(e) => update('salePrice', onlyDigits(e.target.value))}
                    placeholder="249.000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="mb-1 block text-[13px] font-semibold text-[#374151]" htmlFor="prod-weight">
                    Trọng lượng (g)
                  </label>
                  <input
                    id="prod-weight"
                    type="number"
                    className="w-full rounded-[10px] border border-[#e5e7eb] px-3.5 py-2 text-[13px] outline-none transition-all focus:border-[#2563eb] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.12)]"
                    value={form.weight}
                    onChange={(e) => update('weight', e.target.value)}
                    placeholder="500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-semibold text-[#374151]" htmlFor="prod-stock">
                    Tồn kho (Mặc định)
                  </label>
                  <input
                    id="prod-stock"
                    type="number"
                    className="w-full rounded-[10px] border border-[#e5e7eb] px-3.5 py-2 text-[13px] outline-none transition-all focus:border-[#2563eb] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.12)]"
                    value={form.stockQuantity}
                    onChange={(e) => update('stockQuantity', e.target.value)}
                    placeholder="100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[13px] font-semibold text-[#374151]">Nhà cung cấp</label>
                  <Select
                    className="w-full"
                    value={form.supplierId}
                    onChange={(value) => update('supplierId', value)}
                    placeholder="Chọn nhà cung cấp"
                    options={suppliers.map((supplier) => ({
                      value: supplier.id,
                      label: supplier.code ? `${supplier.name} (${supplier.code})` : supplier.name,
                    }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-semibold text-[#374151]">Chất liệu</label>
                  <Select
                    className="w-full"
                    value={form.materialId}
                    onChange={(value) => update('materialId', value)}
                    placeholder="Chọn chất liệu"
                    options={materials.map((material) => ({
                      value: material.id,
                      label: material.code ? `${material.name} (${material.code})` : material.name,
                    }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-semibold text-[#374151]">Đơn vị tính</label>
                  <Select
                    className="w-full"
                    value={form.unitId}
                    onChange={(value) => update('unitId', value)}
                    placeholder="Chọn đơn vị tính"
                    options={units.map((unit) => ({
                      value: unit.id,
                      label: `${unit.name} (${unit.code})`,
                    }))}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[13px] font-semibold text-[#374151]">Hình ảnh sản phẩm</label>
                <div className="rounded-[14px] border border-dashed border-[#e5e7eb] bg-[#f9fafb] p-4 transition-colors hover:bg-[#f3f4f6]">
                  <ImageUpload value={form.imageUrl} onChange={(url) => update('imageUrl', url)} />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[13px] font-semibold text-[#374151]" htmlFor="prod-desc">
                  Mô tả chi tiết
                </label>
                <textarea
                  id="prod-desc"
                  className="w-full rounded-[10px] border border-[#e5e7eb] px-3.5 py-3 text-[13px] outline-none transition-all focus:border-[#2563eb] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.12)]"
                  rows={5}
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="Viết mô tả chi tiết cho sản phẩm này..."
                />
              </div>

              <div>
                <label className="mb-3 block text-[13px] font-bold text-[#111827]">Tag sản phẩm</label>
                <div className="flex flex-wrap gap-2">
                  {productTags.map((tag) => {
                    const active = form.tagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                          active
                            ? 'border-[#2563eb] bg-[#eff6ff] text-[#2563eb]'
                            : 'border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f9fafb]'
                        }`}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                  {productTags.length === 0 && <span className="text-[13px] text-[#6b7280]">Chưa có tag sản phẩm</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-6 overflow-hidden rounded-[14px] border border-[#eceef2] bg-white p-6">
            {categories.length > 0 && (
              <div>
                <label className="mb-4 block text-[13px] font-bold text-[#111827]">Phân loại Danh mục</label>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Danh mục gốc</label>
                    <Select
                      className="w-full bg-white"
                      value={form.categoryLevel1}
                      onChange={(value) => update('categoryLevel1', value)}
                      placeholder="Chọn danh mục"
                      options={getLevel1Categories().map((category) => ({ value: category.id, label: category.name }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Danh mục Cấp 2</label>
                    <Select
                      className="w-full bg-white"
                      value={form.categoryLevel2}
                      onChange={(value) => update('categoryLevel2', value)}
                      disabled={!form.categoryLevel1}
                      placeholder="Không chọn"
                      options={getLevel2Categories().map((category) => ({ value: category.id, label: category.name }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Danh mục Cấp 3</label>
                    <Select
                      className="w-full bg-white"
                      value={form.categoryLevel3}
                      onChange={(value) => update('categoryLevel3', value)}
                      disabled={!form.categoryLevel2}
                      placeholder="Không chọn"
                      options={getLevel3Categories().map((category) => ({ value: category.id, label: category.name }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6b7280]">Danh mục Cấp 4</label>
                    <Select
                      className="w-full bg-white"
                      value={form.categoryLevel4}
                      onChange={(value) => update('categoryLevel4', value)}
                      disabled={!form.categoryLevel3}
                      placeholder="Không chọn"
                      options={getLevel4Categories().map((category) => ({ value: category.id, label: category.name }))}
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-[13px] font-bold text-[#111827]">Biến thể sản phẩm (Size / Màu)</h3>
                  <p className="mt-1 text-[11px] text-[#6b7280]">Tạo các biến thể để quản lý giá và tồn kho riêng biệt</p>
                </div>
                <button
                  type="button"
                  onClick={addVariant}
                  className="rounded-[10px] bg-[#eff6ff] px-4 py-2 text-[13px] font-semibold text-[#2563eb] transition-colors hover:bg-[#dbeafe]"
                >
                  + Thêm biến thể
                </button>
              </div>

              {form.variants.length > 0 && (
                <div className="mb-6 overflow-x-auto rounded-[14px] border border-[#eceef2]">
                  <table className="w-full text-[13px]">
                    <thead className="border-b border-[#eceef2] bg-[#f9fafb] text-[#6b7280]">
                      <tr>
                        <th className="p-4 text-left text-[11px] font-semibold uppercase tracking-[0.05em]">Kích thước</th>
                        <th className="p-4 text-left text-[11px] font-semibold uppercase tracking-[0.05em]">Màu sắc</th>
                        <th className="p-4 text-left text-[11px] font-semibold uppercase tracking-[0.05em]">Giá bán tùy chọn (VNĐ)</th>
                        <th className="p-4 text-left text-[11px] font-semibold uppercase tracking-[0.05em]">Tồn kho</th>
                        <th className="w-16 p-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f3f4f6] bg-white">
                      {form.variants.map((variant) => (
                        <tr key={variant.id} className="transition-colors hover:bg-[#f7f9fc]">
                          <td className="p-3">
                            <Select
                              className="w-full"
                              size="sm"
                              value={variant.sizeId}
                              onChange={(value) => updateVariant(variant.id, 'sizeId', value)}
                              placeholder="-- Cỡ chung --"
                              options={sizes.map((size) => ({ value: size.id, label: size.name }))}
                            />
                          </td>
                          <td className="p-3">
                            <Select
                              className="w-full"
                              size="sm"
                              value={variant.colorId}
                              onChange={(value) => updateVariant(variant.id, 'colorId', value)}
                              placeholder="-- Màu chung --"
                              options={colors.map((color) => ({ value: color.id, label: color.name }))}
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="Bỏ trống -> Giá gốc"
                              className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-right text-[13px] outline-none transition-all focus:border-[#2563eb] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.12)]"
                              value={formatPriceInput(variant.price)}
                              onChange={(e) => updateVariant(variant.id, 'price', onlyDigits(e.target.value))}
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[13px] outline-none transition-all focus:border-[#2563eb] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.12)]"
                              value={variant.stock}
                              onChange={(e) => updateVariant(variant.id, 'stock', e.target.value)}
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              className="rounded-lg p-2 text-[#dc2626] transition-colors hover:bg-[#fee2e2]"
                              onClick={() => removeVariant(variant.id)}
                              title="Xóa"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-col gap-6 md:flex-row">
                <div className="flex-1">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.05em] text-[#374151]">Tạo Kích thước mới</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Tên Size (VD: XL)"
                      className="flex-1 rounded-[10px] border border-[#e5e7eb] px-3.5 py-2 text-[13px] outline-none transition-all focus:border-[#2563eb] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.12)]"
                      value={newSizeName}
                      onChange={(e) => setNewSizeName(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleCreateSize}
                      className="whitespace-nowrap rounded-[10px] border border-[#e5e7eb] bg-white px-4 py-2 text-[13px] font-semibold text-[#374151] transition-colors hover:bg-[#f9fafb]"
                    >
                      Thêm
                    </button>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.05em] text-[#374151]">Tạo Màu sắc mới</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Tên Màu (VD: Đen)"
                      className="flex-1 rounded-[10px] border border-[#e5e7eb] px-3.5 py-2 text-[13px] outline-none transition-all focus:border-[#2563eb] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.12)]"
                      value={newColorName}
                      onChange={(e) => setNewColorName(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleCreateColor}
                      className="whitespace-nowrap rounded-[10px] border border-[#e5e7eb] bg-white px-4 py-2 text-[13px] font-semibold text-[#374151] transition-colors hover:bg-[#f9fafb]"
                    >
                      Thêm
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {form.isComboSet && (
              <div className="border-t border-[#f3f4f6] pt-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-[13px] font-bold text-[#111827]">Thành phần combo</h3>
                    <p className="mt-1 text-[11px] text-[#6b7280]">Chọn các sản phẩm con và số lượng của từng món</p>
                  </div>
                  <button
                    type="button"
                    onClick={addComboItem}
                    className="rounded-[10px] bg-[#fef3c7] px-4 py-2 text-[13px] font-semibold text-[#92400e] transition-colors hover:bg-[#fde68a]"
                  >
                    + Thêm sản phẩm con
                  </button>
                </div>

                <div className="space-y-3">
                  {form.comboItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-1 gap-3 rounded-[14px] border border-[#eceef2] p-4 md:grid-cols-[1fr_120px_52px]">
                      <Select
                        className="w-full"
                        value={item.childProductId}
                        onChange={(value) => updateComboItem(item.id, 'childProductId', value)}
                        placeholder="Chọn sản phẩm con"
                        options={comboOptions}
                      />
                      <input
                        type="number"
                        min={1}
                        className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[13px] outline-none transition-all focus:border-[#2563eb] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.12)]"
                        value={item.quantity}
                        onChange={(e) => updateComboItem(item.id, 'quantity', e.target.value)}
                        placeholder="Số lượng"
                      />
                      <button
                        type="button"
                        className="rounded-lg p-2 text-[#dc2626] transition-colors hover:bg-[#fee2e2]"
                        onClick={() => removeComboItem(item.id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {form.comboItems.length === 0 && (
                    <div className="rounded-[10px] border border-dashed border-[#e5e7eb] px-4 py-3 text-[13px] text-[#6b7280]">
                      Chưa có sản phẩm con cho combo.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 border-t border-[#f3f4f6] pt-6 md:grid-cols-3">
              <label className="cursor-pointer rounded-[14px] border border-[#eceef2] p-4 transition-colors hover:bg-[#f9fafb]">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-[#e5e7eb] text-[#2563eb] focus:ring-[#2563eb]"
                    checked={form.isComboSet}
                    onChange={(e) => update('isComboSet', e.target.checked)}
                  />
                  <div>
                    <span className="block text-[13px] font-semibold text-[#111827]">Sản phẩm Combo</span>
                    <span className="block text-[11px] text-[#6b7280]">Được tạo từ nhiều sản phẩm khác</span>
                  </div>
                </div>
              </label>

              <label className="cursor-pointer rounded-[14px] border border-[#eceef2] p-4 transition-colors hover:bg-[#f9fafb]">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-[#e5e7eb] text-[#2563eb] focus:ring-[#2563eb]"
                    checked={form.isGiftItem}
                    onChange={(e) => update('isGiftItem', e.target.checked)}
                  />
                  <div>
                    <span className="block text-[13px] font-semibold text-[#111827]">Quà tặng kèm</span>
                    <span className="block text-[11px] text-[#6b7280]">Sản phẩm dùng làm quà tặng khuyến mãi</span>
                  </div>
                </div>
              </label>

              <label className="cursor-pointer rounded-[14px] border border-[#2563eb] bg-[#eff6ff] p-4 transition-colors hover:bg-[#dbeafe]">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-[#2563eb] text-[#2563eb] focus:ring-[#2563eb]"
                    checked={form.isActive}
                    onChange={(e) => update('isActive', e.target.checked)}
                  />
                  <div>
                    <span className="block text-[13px] font-semibold text-[#1e3a8a]">Kích hoạt sản phẩm</span>
                    <span className="block text-[11px] text-[#2563eb]">Hiển thị trên cửa hàng</span>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
