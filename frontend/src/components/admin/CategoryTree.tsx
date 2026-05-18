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
        <tr className="hover:bg-gray-50">
          <td className="px-6 py-4">
            <div className="flex items-start gap-2" style={{ paddingLeft: `${indent}px` }}>
              <span className={`mt-0.5 ${level === 0 ? 'text-lg' : 'text-sm'}`}>
                {level === 0 ? '📁' : '📄'}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className={`${level === 0 ? 'font-semibold text-gray-800' : 'font-medium text-gray-700'}`}>
                  {category.name}
                </span>
                <span className="font-mono text-xs text-gray-500">
                  {category.slug}
                </span>
              </div>
            </div>
          </td>
          <td className="px-6 py-4">
            {category.parent ? (
              <span className="text-sm text-gray-600">{category.parent.name}</span>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </td>
          <td className="px-6 py-4">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              {category._count.products} sản phẩm
            </span>
          </td>
          <td className="px-6 py-4 text-gray-700">{category.sortOrder}</td>
          <td className="px-6 py-4">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              category.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {category.isActive ? 'Hoạt động' : 'Tắt'}
            </span>
          </td>
          <td className="px-6 py-4">
            <div className="flex items-center justify-end gap-2">
              <CategoryRowActions
                category={category}
                allCategories={categories.map(c => ({ id: c.id, name: c.name, parentId: c.parentId }))}
              />
              {/* Expand/Collapse button - only for level 1 with children */}
              {level === 0 && hasChildren && (
                <button
                  onClick={() => toggleExpand(category.id)}
                  className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                  title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-600" />
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
            <div className="text-center py-12">
              <div className="text-6xl mb-3">📁</div>
              <div className="text-xl font-semibold text-gray-800 mb-2">Chưa có danh mục nào</div>
              <div className="text-gray-600">Tạo danh mục đầu tiên để phân loại sản phẩm</div>
            </div>
          </td>
        </tr>
      ) : (
        rootCategories.map(category => renderCategory(category, 0))
      )}
    </>
  );
}
