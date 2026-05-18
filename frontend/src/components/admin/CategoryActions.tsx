'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import Select from '@/components/ui/Select';

interface Category {
  id: string;
  name: string;
  parentId?: string | null;
}

interface CategoryActionsProps {
  categories?: Category[];
}

export default function CategoryActions({ categories = [] }: CategoryActionsProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    level: '1', // 1 = root, 2-4 = child levels
    parentId: '',
    sortOrder: '0',
    isActive: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiClientClient.post('/categories', {
        ...form,
        sortOrder: parseInt(form.sortOrder) || 0,
        parentId: form.parentId || null,
      });

      setShowModal(false);
      setForm({
        name: '',
        slug: '',
        description: '',
        level: '1',
        parentId: '',
        sortOrder: '0',
        isActive: true,
      });
      router.refresh();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi tạo danh mục');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string | boolean) => {
    setForm(prev => {
      const newForm = { ...prev, [field]: value };
      
      // Auto-generate slug from name
      if (field === 'name' && typeof value === 'string') {
        newForm.slug = value
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }
      
      // Reset parentId when level changes to 1 (root)
      if (field === 'level' && value === '1') {
        newForm.parentId = '';
      }
      
      return newForm;
    });
  };

  // Calculate actual level of a category by traversing parent chain
  const getCategoryLevel = (cat: Category): number => {
    let level = 1;
    let current = cat;
    while (current.parentId) {
      level++;
      const parent = categories.find(c => c.id === current.parentId);
      if (!parent) break;
      current = parent;
    }
    return level;
  };

  // Filter available parent categories based on selected level
  const getAvailableParents = () => {
    const targetLevel = parseInt(form.level);
    if (targetLevel === 1) return []; // Root level has no parent
    
    // For level N, show only categories at level N-1
    const parentLevel = targetLevel - 1;
    return categories.filter(cat => getCategoryLevel(cat) === parentLevel);
  };

  return (
    <>
      <button 
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors" 
        onClick={() => setShowModal(true)}
      >
        + Tạo Danh mục
      </button>

      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Tạo Danh mục mới</h2>
              <button 
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none" 
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <span>⚠</span>
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="cat-name">
                      Tên danh mục *
                    </label>
                    <input 
                      id="cat-name" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                      required
                      value={form.name} 
                      onChange={e => update('name', e.target.value)}
                      placeholder="VD: Áo thun, Quần jean" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="cat-slug">
                      Slug *
                    </label>
                    <input 
                      id="cat-slug" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm" 
                      required
                      value={form.slug} 
                      onChange={e => update('slug', e.target.value)}
                      placeholder="ao-thun" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="cat-level">
                      Cấp độ *
                    </label>
                    <Select
                      value={form.level}
                      onChange={(val) => update('level', val)}
                      className="w-full"
                      options={[
                        { value: '1', label: 'Cấp 1 (Root - Cao nhất)' },
                        { value: '2', label: 'Cấp 2' },
                        { value: '3', label: 'Cấp 3' },
                        { value: '4', label: 'Cấp 4' }
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="cat-parent">
                      Danh mục cha
                    </label>
                    {form.level === '1' ? (
                      <input
                        type="text"
                        disabled
                        value="-- Không có (Root) --"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                      />
                    ) : (
                      <Select
                        value={form.parentId}
                        onChange={(val) => update('parentId', val)}
                        className="w-full"
                        placeholder="-- Chọn danh mục cha --"
                        options={getAvailableParents().map(cat => ({
                          value: cat.id,
                          label: cat.name
                        }))}
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="cat-sort">
                    Thứ tự sắp xếp
                  </label>
                  <input 
                    id="cat-sort" 
                    type="number" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={form.sortOrder} 
                    onChange={e => update('sortOrder', e.target.value)}
                    placeholder="0" 
                  />
                  <p className="text-xs text-gray-500 mt-1">Số nhỏ hơn sẽ hiển thị trước</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="cat-desc">
                    Mô tả
                  </label>
                  <textarea 
                    id="cat-desc" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    rows={3}
                    value={form.description} 
                    onChange={e => update('description', e.target.value)}
                    placeholder="Mô tả chi tiết danh mục..." 
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    checked={form.isActive}
                    onChange={e => update('isActive', e.target.checked)} 
                  />
                  <span className="text-gray-700">Kích hoạt danh mục</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button 
                  type="button" 
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors" 
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                  disabled={loading}
                >
                  {loading ? 'Đang tạo...' : 'Tạo Danh mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
