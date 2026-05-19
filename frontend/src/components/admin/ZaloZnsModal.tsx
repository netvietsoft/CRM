'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';
import Select from '@/components/ui/Select';

interface ZaloZnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUserIds: string[];
  totalCustomersCount: number; // total selected
  onSuccess: () => void;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  zaloTemplateId: string;
  zaloStatus: string;
  params: TemplateParam[] | null;
}

interface TemplateParam {
  key: string;
  label?: string | null;
  required?: boolean;
}

interface BulkZaloResponse {
  message?: string;
}

interface ApiErrorLike {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiErrorLike;
    return apiError.response?.data?.message || apiError.message || fallback;
  }

  return fallback;
}

export default function ZaloZnsModal({ isOpen, onClose, selectedUserIds, totalCustomersCount, onSuccess }: ZaloZnsModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetchingTemplates, setFetchingTemplates] = useState(true);
  const [templateData, setTemplateData] = useState<Record<string, string>>({});

  const fetchTemplates = useCallback(() => {
    return apiClientClient.get<Template[]>('/notifications/zalo/templates');
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;

    Promise.resolve()
      .then(() => {
        if (!cancelled) {
          setFetchingTemplates(true);
          setTemplateData({});
          setSelectedTemplateId('');
        }

        return fetchTemplates();
      })
      .then((data) => {
        if (!cancelled) {
          const enableTemplates = data.filter(template => template.zaloStatus === 'ENABLE' || template.zaloStatus === 'PENDING_REVIEW');
          setTemplates(enableTemplates);
        }
      })
      .catch((error) => {
        console.error('Error fetching templates:', error);
        if (!cancelled) {
          setTemplates([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setFetchingTemplates(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fetchTemplates, isOpen]);

  const handleTemplateChange = (val: string) => {
    setSelectedTemplateId(val);
    setTemplateData({}); // reset data when changing template
  };

  const handleDataChange = (key: string, value: string) => {
    setTemplateData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) return;

    if (!confirm(`Bạn chắc chắn muốn gửi tin nhắn này đến ${totalCustomersCount} khách hàng đã chọn?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await apiClientClient.post<BulkZaloResponse>('/notifications/zalo/bulk', {
        userIds: selectedUserIds,
        templateId: selectedTemplateId,
        templateData: templateData
      });
      alert(res.message || 'Hệ thống đang xử lý gửi tin nhắn.');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error sending Zalo ZNS:', error);
      alert(getErrorMessage(error, 'Có lỗi xảy ra khi gửi tin nhắn.'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-50/50">
          <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            <span className="text-2xl">💬</span> Gửi tin nhắn Zalo (ZBS)
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-blue-50 text-blue-800 p-3 rounded-xl text-sm font-medium border border-blue-100">
            Đang chọn gửi đến <strong>{totalCustomersCount}</strong> khách hàng. (Chỉ những khách hàng có SĐT hợp lệ mới được gửi).
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Chọn mẫu tin nhắn (Template)</label>
            {fetchingTemplates ? (
              <div className="text-sm text-gray-500">Đang tải danh sách mẫu...</div>
            ) : (
              <Select
                className="w-full"
                value={selectedTemplateId}
                onChange={handleTemplateChange}
                placeholder="-- Chọn mẫu tin nhắn --"
                options={templates.map(t => ({
                  value: t.id,
                  label: `${t.name} ${t.zaloStatus !== 'ENABLE' ? '(Chưa duyệt)' : ''}`
                }))}
              />
            )}
            {templates.length === 0 && !fetchingTemplates && (
              <p className="text-xs text-red-500 mt-1">Chưa có mẫu tin nhắn nào được Zalo duyệt. Vui lòng tạo tại trang Kết nối Zalo.</p>
            )}
          </div>

          {selectedTemplate && (
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Xem trước nội dung</h4>
              <p className="font-semibold text-gray-800 text-sm mb-1">{selectedTemplate.subject}</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{selectedTemplate.body}</p>
              
              {/* Giả lập form nhập params động nếu có định nghĩa params trong DB */}
              {selectedTemplate.params && Array.isArray(selectedTemplate.params) && selectedTemplate.params.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Thông tin bổ sung</h4>
                  {selectedTemplate.params.map((param) => (
                    <div key={param.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{param.label || param.key}</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        value={templateData[param.key] || ''}
                        onChange={(e) => handleDataChange(param.key, e.target.value)}
                        required={param.required}
                        placeholder={`Nhập ${param.label || param.key}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !selectedTemplateId || templates.length === 0}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Đang xử lý...
                </>
              ) : (
                'Gửi tin nhắn'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
