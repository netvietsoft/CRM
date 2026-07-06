'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
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

export default function CategoryTree({ categories }: CategoryTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Get children of a category
  const getChildren = (parentId: string) => {
    return categories.filter(c => c.parentId === parentId);
  };

  // Render a category row with proper indentation
  const renderCategory = (category: Category, level: number = 0) => {
    const children = getChildren(category.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(category.id);
    const indent = level * 32; // 32px per level

    return (
      <React.Fragment key={category.id}>
        <tr className="border-t border-[#f3f4f6] transition-colors hover:bg-[#eff6ff]">
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
              />
              {/* Expand/Collapse button - only for level 1 with children */}
              {level === 0 && hasChildren && (
                <button
                  onClick={() => toggleExpand(category.id)}
                  className="rounded p-1.5 transition-colors hover:bg-[#eff6ff]"
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

  // Get root categories (level 1)
  const rootCategories = categories.filter(c => !c.parentId);

  return (
    <>
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
    </>
  );
}
