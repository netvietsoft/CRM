'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Plus, ArrowLeft, RefreshCcw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { apiClientClient } from '@/lib/apiClientClient';

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  zaloTemplateId: string;
  zaloStatus: string;
  createdAt: string;
}

export default function ZaloIntegrationPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingToken, setRefreshingToken] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form states
  const [formName, setFormName] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formBtnName, setFormBtnName] = useState('Mua ngay');
  const [formBtnUrl, setFormBtnUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isZaloConfigured, setIsZaloConfigured] = useState<boolean>(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const [data, configData] = await Promise.all([
        apiClientClient.get<Template[]>('/notifications/zalo/templates'),
        apiClientClient.get<any>('/notifications/zalo/config').catch(() => ({ isConfigured: false }))
      ]);
      setTemplates(data || []);
      setIsZaloConfigured(configData.isConfigured);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    setRefreshingToken(true);
    try {
      const res = await apiClientClient.post<any>('/notifications/zalo/token/refresh', {});
      alert(res.message || 'Thao tác thành công');
    } catch (e: any) {
      alert(e.response?.data?.message || 'Có lỗi xảy ra khi làm mới token');
    } finally {
      setRefreshingToken(false);
    }
  };

  const handleSyncStatus = async (id: string) => {
    try {
      const res = await apiClientClient.post<any>(`/notifications/zalo/templates/${id}/sync`, {});
      alert(`Trạng thái mới: ${res.status}`);
      fetchTemplates();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Không thể đồng bộ trạng thái');
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClientClient.post<any>('/notifications/zalo/templates', {
        name: formName,
        title: formTitle,
        content: formContent,
        buttonName: formBtnName,
        buttonUrl: formBtnUrl
      });
      alert('Tạo mẫu tin nhắn thành công. Đang chờ Zalo duyệt!');
      setIsModalOpen(false);
      setFormName('');
      setFormTitle('');
      setFormContent('');
      setFormBtnUrl('');
      fetchTemplates();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Có lỗi khi tạo mẫu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'ENABLE') return <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-200"><CheckCircle size={12}/> Đã duyệt</span>;
    if (status === 'PENDING_REVIEW') return <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 text-xs font-semibold border border-yellow-200"><Clock size={12}/> Chờ duyệt</span>;
    if (status === 'REJECT') return <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold border border-red-200"><AlertCircle size={12}/> Từ chối</span>;
    return <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold border border-gray-200">{status || 'UNKNOWN'}</span>;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/admin/integrations')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white text-xl shadow-sm">💬</span>
            Zalo ZBS & Templates
          </h1>
          <p className="text-gray-500 text-sm mt-1">Quản lý cấu hình Zalo OA và các mẫu tin nhắn (ZBS Template Message)</p>
        </div>
      </div>

      {!isZaloConfigured && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 text-red-700 items-start">
          <AlertCircle className="shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold">Zalo chưa được cấu hình!</h3>
            <p className="text-sm mt-1">Hệ thống không tìm thấy `ZALO_APP_ID` và `ZALO_APP_SECRET` trong biến môi trường (.env). Tính năng gửi tin nhắn Zalo sẽ bị vô hiệu hóa cho đến khi bạn cấu hình xong.</p>
          </div>
        </div>
      )}

      {/* Token Management Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Trạng thái Kết nối OA</h2>
            <p className="text-sm text-gray-500 mt-1">Hệ thống tự động làm mới Access Token mỗi 20 giờ. Bạn có thể ép làm mới thủ công nếu cần.</p>
          </div>
          <button 
            onClick={handleRefreshToken}
            disabled={refreshingToken}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshingToken ? 'animate-spin' : ''} />
            {refreshingToken ? 'Đang làm mới...' : 'Làm mới Token'}
          </button>
        </div>
      </div>

      {/* Templates Management */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Danh sách Mẫu tin nhắn (Templates)</h2>
            <p className="text-sm text-gray-500 mt-1">Các mẫu tin nhắn ZBS cần được Zalo duyệt trước khi có thể gửi đi.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-semibold shadow-sm transition-colors"
          >
            <Plus size={18} />
            Tạo mẫu mới
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">Đang tải danh sách...</div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📄</div>
            <h3 className="text-lg font-semibold text-gray-800">Chưa có mẫu tin nhắn nào</h3>
            <p className="text-gray-500 text-sm mt-1">Hãy tạo một mẫu Khuyến mãi (Promotion) đầu tiên.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tên mẫu</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nội dung</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Template ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {templates.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-800 text-sm">{t.name}</td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="font-medium text-gray-700 text-sm truncate">{t.subject}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{t.body}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-blue-600">{t.zaloTemplateId || 'N/A'}</td>
                    <td className="px-6 py-4">
                      {getStatusBadge(t.zaloStatus)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleSyncStatus(t.id)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Đồng bộ trạng thái từ Zalo"
                      >
                        <RefreshCcw size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Template Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                Tạo Mẫu Khuyến Mãi (PROMOTION)
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
            </div>

            <form onSubmit={handleCreateTemplate} className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tên quản lý (nội bộ) <span className="text-red-500">*</span></label>
                    <input type="text" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={formName} onChange={e=>setFormName(e.target.value)} required placeholder="VD: Khuyến mãi Tháng 5" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tiêu đề (TITLE) <span className="text-red-500">*</span></label>
                    <p className="text-xs text-gray-500 mb-1">Tối thiểu 9, tối đa 65 ký tự.</p>
                    <input type="text" minLength={9} maxLength={65} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={formTitle} onChange={e=>setFormTitle(e.target.value)} required placeholder="VD: Mừng đại lễ siêu giảm giá" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nội dung (PARAGRAPH) <span className="text-red-500">*</span></label>
                    <p className="text-xs text-gray-500 mb-1">Tối đa 90 ký tự/đoạn.</p>
                    <textarea rows={3} maxLength={90} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" value={formContent} onChange={e=>setFormContent(e.target.value)} required placeholder="Nhập nội dung thông điệp ngắn gọn..."></textarea>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Tên nút (BUTTON) <span className="text-red-500">*</span></label>
                      <input type="text" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={formBtnName} onChange={e=>setFormBtnName(e.target.value)} required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Link URL (BUTTON) <span className="text-red-500">*</span></label>
                      <input type="url" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={formBtnUrl} onChange={e=>setFormBtnUrl(e.target.value)} required placeholder="https://..." />
                    </div>
                  </div>
                </div>

                {/* Preview Panel */}
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 flex flex-col justify-center items-center">
                  <div className="bg-white w-full max-w-sm rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-[#0068FF] text-white px-4 py-2.5 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/20"></div>
                      <span className="font-semibold text-sm">Zalo OA Của Bạn</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="font-bold text-gray-900 text-[15px] leading-tight">
                        {formTitle || 'Tiêu đề thông báo...'}
                      </div>
                      <div className="text-gray-700 text-sm leading-relaxed">
                        {formContent || 'Nội dung chi tiết thông báo sẽ hiển thị ở đây...'}
                      </div>
                      <div className="pt-2">
                        <button type="button" className="w-full block text-center py-2.5 bg-gray-100 hover:bg-gray-200 text-blue-600 font-semibold rounded-xl text-sm transition-colors">
                          {formBtnName || 'Xem chi tiết'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-4 text-center">Bản xem trước mang tính chất minh họa, hiển thị thực tế có thể khác do Zalo điều chỉnh.</p>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-gray-100 flex gap-3 justify-end">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors">
                  Hủy
                </button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-transform active:scale-95 disabled:opacity-50">
                  {isSubmitting ? 'Đang tạo...' : 'Tạo Mẫu & Gửi Duyệt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
