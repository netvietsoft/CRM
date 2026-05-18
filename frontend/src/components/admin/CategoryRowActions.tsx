'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { apiClientClient } from '@/lib/apiClientClient';
import Select from '@/components/ui/Select';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface CategoryRowActionsProps {
  category: Category;
  allCategories: { id: string; name: string; parentId?: string | null }[];
}

export default function CategoryRowActions({ category, allCategories }: CategoryRowActionsProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Calculate level based on parentId
  const calculateLevel = (cat: Category) => {
    if (!cat.parentId) return '1';
    const parent = allCategories.find(c => c.id === cat.parentId);
    if (!parent) return '2';
    if (!parent.parentId) return '2';
    return '3'; // Simplified, could be extended
  };

  const [form, setForm] = useState({
    name: category.name,
    slug: category.slug,
    description: category.description || '',
    level: calculateLevel(category),
    parentId: category.parentId || '',
    sortOrder: category.sortOrder.toString(),
    isActive: category.isActive,
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiClientClient.patch(`/categories/${category.id}`, {
        ...form,
        sortOrder: parseInt(form.sortOrder) || 0,
        parentId: form.parentId || null,
      });

      setShowEditModal(false);
      router.refresh();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi cập nhật danh mục');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      await apiClientClient.delete(`/categories/${category.id}`);
      setShowDeleteModal(false);
      router.refresh();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi xóa danh mục');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string | boolean) => {
    setForm(prev => {
      const newForm = { ...prev, [field]: value };
      
      // Reset parentId when level changes to 1 (root)
      if (field === 'level' && value === '1') {
        newForm.parentId = '';
      }
      
      return newForm;
    });
  };

  const getAvailableParents = () => {
    const level = parseInt(form.level);
    if (level === 1) return [];
    
    return allCategories.filter(cat => {
      // Don't show self or children as parent options
      if (cat.id === category.id) return false;
      
      const isRoot = !cat.parentId;
      if (level === 2) return isRoot;
      return !isRoot;
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowEditModal(true)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Sửa
        </button>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Xóa"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
          onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Sửa Danh mục</h2>
              <button 
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none" 
                onClick={() => setShowEditModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="p-6 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <span>⚠</span>
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="edit-name">
                      Tên danh mục *
                    </label>
                    <input 
                      id="edit-name" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                      required
                      value={form.name} 
                      onChange={e => update('name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="edit-slug">
                      Slug *
                    </label>
                    <input 
                      id="edit-slug" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm" 
                      required
                      value={form.slug} 
                      onChange={e => update('slug', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="edit-level">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="edit-parent">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="edit-sort">
                    Thứ tự sắp xếp
                  </label>
                  <input 
                    id="edit-sort" 
                    type="number" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={form.sortOrder} 
                    onChange={e => update('sortOrder', e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Số nhỏ hơn sẽ hiển thị trước</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="edit-desc">
                    Mô tả
                  </label>
                  <textarea 
                    id="edit-desc" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    rows={3}
                    value={form.description} 
                    onChange={e => update('description', e.target.value)}
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
                  onClick={() => setShowEditModal(false)}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                  disabled={loading}
                >
                  {loading ? 'Đang cập nhật...' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 text-center mb-2">
                Xóa danh mục?
              </h3>
              <p className="text-gray-600 text-center mb-4">
                Bạn có chắc chắn muốn xóa danh mục <strong>{category.name}</strong>?
              </p>
              
              {/* Warning about children */}
              {allCategories.filter(c => c.parentId === category.id).length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <span className="text-orange-600 text-lg">⚠️</span>
                    <div className="text-sm text-orange-800">
                      <strong>Cảnh báo:</strong> Danh mục này có{' '}
                      <strong>{allCategories.filter(c => c.parentId === category.id).length} danh mục con</strong>.
                      Tất cả danh mục con cũng sẽ bị xóa.
                    </div>
                  </div>
                </div>
              )}

              <p className="text-gray-500 text-sm text-center mb-6">
                Hành động này không thể hoàn tác.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 mb-4">
                  <span>⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button 
                  type="button" 
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors" 
                  onClick={() => setShowDeleteModal(false)}
                  disabled={loading}
                >
                  Hủy
                </button>
                <button 
                  type="button"
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {loading ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
