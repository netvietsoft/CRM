'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Check, Minus, Plus } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategoryIds: string[];
  onFilterChange: (categoryIds: string[]) => void;
}

export default function CategoryFilter({
  categories,
  selectedCategoryIds,
  onFilterChange,
}: CategoryFilterProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  const getCategoriesByParent = (parentId: string | null) => {
    return categories.filter((category) => category.parentId === parentId);
  };

  const hasChildren = (categoryId: string) => {
    return categories.some((category) => category.parentId === categoryId);
  };

  const toggleExpand = (categoryId: string) => {
    const next = new Set(expandedCategories);
    if (next.has(categoryId)) {
      next.delete(categoryId);
    } else {
      next.add(categoryId);
    }
    setExpandedCategories(next);
  };

  const handleCategoryClick = (category: Category) => {
    if (selectedCategoryIds.includes(category.id)) {
      onFilterChange(selectedCategoryIds.filter(id => id !== category.id));
    } else {
      onFilterChange([...selectedCategoryIds, category.id]);
    }
    if (hasChildren(category.id)) {
      toggleExpand(category.id);
    }
  };

  const renderCategory = (category: Category, level = 0) => {
    const isExpandedCat = expandedCategories.has(category.id);
    const isSelected = selectedCategoryIds.includes(category.id);
    const children = getCategoriesByParent(category.id);
    const hasChild = children.length > 0;

    return (
      <div key={category.id}>
        <button
          type="button"
          onClick={() => handleCategoryClick(category)}
          className="group flex w-full items-center gap-3 py-3 text-left text-sm transition-colors hover:text-gray-900"
          style={{ paddingLeft: `${level * 20}px` }}
        >
          <div className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
            isSelected 
              ? 'bg-gray-900 border-gray-900' 
              : 'border-gray-300 group-hover:border-gray-400'
          }`}>
            {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
          </div>
          <span className={`flex-1 ${isSelected ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
            {category.name}
          </span>
          {hasChild && (
            <span
              className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={(event) => {
                event.stopPropagation();
                toggleExpand(category.id);
              }}
            >
              {isExpandedCat ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
          )}
        </button>

        {isExpandedCat && hasChild && (
          <div className="border-l border-gray-100 ml-2">
            {children.map((child) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootCategories = getCategoriesByParent(null);

  return (
    <div className="border-b border-gray-200 pb-1">
      {/* Header with +/- toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <h3 className="text-[15px] font-bold text-gray-900 tracking-tight">Danh mục</h3>
        <span className="text-gray-400 hover:text-gray-600 transition-colors">
          {isExpanded ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </span>
      </button>

      {/* Content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[500px] opacity-100 pb-3' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="max-h-[320px] overflow-y-auto pr-1 space-y-0 custom-scrollbar">
          {rootCategories.map((category) => renderCategory(category))}
        </div>

        {selectedCategoryIds.length > 0 && (
          <button
            type="button"
            onClick={() => onFilterChange([])}
            className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2 transition-colors"
          >
            Bỏ chọn tất cả
          </button>
        )}
      </div>
    </div>
  );
}
