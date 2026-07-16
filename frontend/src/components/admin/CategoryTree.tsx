'use client';

import React, { useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight } from 'lucide-react';
import CategoryRowActions from './CategoryRowActions';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  parent?: { name: string } | null;
  _count: {
    products: number;
    children: number;
  };
}

interface CategoryTreeProps {
  categories: Category[];
}

type SortKey = 'name' | 'parent' | 'products' | 'sortOrder' | 'isActive';

const HEADERS: Array<{ key: SortKey; label: string }> = [
  { key: 'name', label: 'Tên danh mục' },
  { key: 'parent', label: 'Danh mục cha' },
  { key: 'products', label: 'Sản phẩm' },
  { key: 'sortOrder', label: 'Thứ tự' },
  { key: 'isActive', label: 'Trạng thái' },
];

// Bảng danh mục: header SORT được (mũi tên chỉ hướng), hàng zebra xen kẽ,
// click vào khoảng trống của hàng = mở modal Sửa luôn (giữ cây cha–con khi sort).
export default function CategoryTree({ categories }: CategoryTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('sortOrder');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  // Tăng số → CategoryRowActions của đúng danh mục tự mở modal Sửa (row-click).
  const [editSignals, setEditSignals] = useState<Record<string, number>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const requestEdit = (id: string) => setEditSignals(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));

  const cmp = (a: Category, b: Category) => {
    let r = 0;
    switch (sortKey) {
      case 'name': r = a.name.localeCompare(b.name, 'vi'); break;
      case 'parent': r = (a.parent?.name || '').localeCompare(b.parent?.name || '', 'vi'); break;
      case 'products': r = a._count.products - b._count.products; break;
      case 'sortOrder': r = a.sortOrder - b.sortOrder; break;
      case 'isActive': r = Number(a.isActive) - Number(b.isActive); break;
    }
    return sortDir === 'asc' ? r : -r;
  };

  const onSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  // Sort áp cho danh mục GỐC và trong từng nhóm con — giữ nguyên quan hệ cha–con.
  const getChildren = (parentId: string) => categories.filter(c => c.parentId === parentId).sort(cmp);

  // Zebra: đếm dòng theo thứ tự render thực tế (reset mỗi lần render).
  let rowIndex = 0;

  const renderCategory = (category: Category, level: number = 0): React.ReactNode => {
    const children = getChildren(category.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(category.id);
    const indent = level * 32; // 32px per level
    const zebraCls = rowIndex++ % 2 === 1 ? 'bg-[#f7f9fc]' : 'bg-white';

    return (
      <React.Fragment key={category.id}>
        <tr
          onClick={(e) => {
            // Bỏ qua khi bấm vào nút/label bên trong (Sửa, Xóa, mũi tên mở rộng, modal…).
            if ((e.target as HTMLElement).closest('button, a, input, select, textarea, label, [role="dialog"]')) return;
            requestEdit(category.id);
          }}
          title="Click để sửa danh mục"
          className={`${zebraCls} border-t border-[#f3f4f6] transition-colors hover:bg-[#eff6ff] cursor-pointer`}
        >
          <td className="px-4 py-[11px]">
            <div
              className="flex items-start gap-2"
              style={level > 0 ? { paddingLeft: `${indent}px`, borderLeft: '2px solid #e8eaef' } : { paddingLeft: `${indent}px` }}
            >
              <span className={`mt-0.5 ${level === 0 ? 'text-lg' : 'text-sm'}`}>
                {level === 0 ? '📁' : '📄'}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className={`${level === 0 ? 'text-[14px] font-bold text-gray-800' : 'text-[13px] font-medium text-[#374151]'}`}>
                  {category.name}
                </span>
                <span className="font-mono text-[11.5px] text-[#9ca3af]">
                  {category.slug}
                </span>
              </div>
            </div>
          </td>
          <td className="px-4 py-[11px]">
            {category.parent ? (
              <span className="text-[13px] text-[#4b5563]">{category.parent.name}</span>
            ) : (
              <span className="text-[#d1d5db]">—</span>
            )}
          </td>
          <td className="px-4 py-[11px]">
            <span className="inline-flex items-center rounded-full bg-[#dbeafe] px-2.5 py-[3px] text-[11px] font-semibold text-[#2140da]">
              {category._count.products} sản phẩm
            </span>
          </td>
          <td className="px-4 py-[11px] text-[13px] text-[#4b5563]">{category.sortOrder}</td>
          <td className="px-4 py-[11px]">
            <span className={`inline-flex items-center rounded-full px-2.5 py-[3px] text-[11px] font-semibold ${
              category.isActive ? 'bg-[#d1fae5] text-[#047857]' : 'bg-[#fee2e2] text-[#dc2626]'
            }`}>
              {category.isActive ? 'Hoạt động' : 'Tắt'}
            </span>
          </td>
          <td className="px-4 py-[11px]">
            <div className="flex items-center justify-end gap-2">
              <CategoryRowActions
                category={category}
                allCategories={categories.map(c => ({ id: c.id, name: c.name, parentId: c.parentId }))}
                openEditSignal={editSignals[category.id] || 0}
              />
              {/* Expand/Collapse button - only for level 1 with children */}
              {level === 0 && hasChildren && (
                <button
                  onClick={() => toggleExpand(category.id)}
                  className="rounded p-1.5 transition-colors hover:bg-[#dbeafe]"
                  title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-[#6b7280]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-[#6b7280]" />
                  )}
                </button>
              )}
            </div>
          </td>
        </tr>

        {/* Render ALL children recursively if expanded (for level 1 only) */}
        {level === 0 && hasChildren && isExpanded && children.map(child => renderCategory(child, level + 1))}

        {/* For level 2+, always render children (no expand/collapse) */}
        {level > 0 && hasChildren && children.map(child => renderCategory(child, level + 1))}
      </React.Fragment>
    );
  };

  const rootCategories = categories.filter(c => !c.parentId).sort(cmp);

  return (
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          {HEADERS.map(({ key, label }) => {
            const active = sortKey === key;
            const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
            return (
              <th key={key} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                <button
                  onClick={() => onSort(key)}
                  className={`inline-flex items-center gap-1.5 rounded px-1 py-0.5 -ml-1 transition-colors ${active ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                  title={`Sắp xếp theo ${label.toLowerCase()}`}
                >
                  <span>{label}</span>
                  <Icon className="h-3.5 w-3.5" />
                </button>
              </th>
            );
          })}
          <th className="px-6 py-3"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {categories.length === 0 ? (
          <tr>
            <td colSpan={6}>
              <div className="py-12 text-center">
                <div className="mb-3 text-6xl">📁</div>
                <div className="mb-2 text-[17px] font-bold text-gray-900">Chưa có danh mục nào</div>
                <div className="text-[13px] text-[#6b7280]">Tạo danh mục đầu tiên để phân loại sản phẩm</div>
              </div>
            </td>
          </tr>
        ) : (
          rootCategories.map(category => renderCategory(category, 0))
        )}
      </tbody>
    </table>
  );
}
