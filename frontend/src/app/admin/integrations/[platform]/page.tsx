'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, X } from 'lucide-react';
import { apiClientClient } from '@/lib/apiClientClient';

interface Integration {
  id: string;
  platform: string;
  apiKey: string | null;
  apiSecret: string | null;
  shopId: string | null;
  accessToken: string | null;
  isActive: boolean;
  storeId: string;
  metadata?: any;
}

const PLATFORMS = [
  { id: 'PANCAKE', name: 'Pancake Pos', icon: '🥞', color: 'bg-orange-500', desc: 'Đồng bộ đơn hàng, kho hàng đa kênh' },
  { id: 'SHOPEE', name: 'Shopee', icon: '🛍️', color: 'bg-orange-600', desc: 'Đồng bộ tự động đơn hàng Shopee' },
  { id: 'TIKTOK', name: 'TikTok Shop', icon: '🎵', color: 'bg-black', desc: 'Kết nối kho vận TikTok Shop' },
  { id: 'ZALO', name: 'Zalo OA', icon: '💬', color: 'bg-blue-500', desc: 'Gửi tin nhắn chăm sóc tự động' },
  { id: 'VIETTELPOST', name: 'ViettelPost', icon: '📦', color: 'bg-red-600', desc: 'Tính phí vận chuyển & đẩy đơn' },
];

export default function IntegrationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const platformId = (params.platform as string)?.toUpperCase();

  const platformInfo = PLATFORMS.find(p => p.id === platformId);

  const [loading, setLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');

  // Form states
  const [formApiKey, setFormApiKey] = useState('');
  const [formApiSecret, setFormApiSecret] = useState('');
  const [formShopId, setFormShopId] = useState('');
  const [formAccessToken, setFormAccessToken] = useState('');
  const [formIsActive, setFormIsActive] = useState(false);
  const [formMetadata, setFormMetadata] = useState<any>({});

  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [isSyncingCategories, setIsSyncingCategories] = useState(false);
  const [showFields, setShowFields] = useState<Record<string, boolean>>({});
  const [selectedOrderDates, setSelectedOrderDates] = useState<string[]>([]);
  const [customOrderDate, setCustomOrderDate] = useState('');
  const [customOrderEndDate, setCustomOrderEndDate] = useState('');

  const toggleField = (field: string) => {
    setShowFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  useEffect(() => {
    if (platformId) {
      fetchIntegration();
    }
  }, [platformId, selectedStoreId]);

  const fetchIntegration = async () => {
    try {
      const data = await apiClientClient.get<Integration[]>('/integrations', {
        params: { storeId: selectedStoreId }
      });

      const existing = (data || []).find(i => i.platform === platformId);
      if (existing) {
        setFormApiKey(existing.apiKey || '');
        setFormApiSecret(existing.apiSecret || '');
        setFormShopId(existing.shopId || '');
        setFormAccessToken(existing.accessToken || '');
        setFormIsActive(existing.isActive || false);
        setFormMetadata(existing.metadata || {});
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        platform: platformId,
        apiKey: formApiKey,
        apiSecret: formApiSecret,
        shopId: formShopId,
        accessToken: formAccessToken,
        isActive: formIsActive,
        metadata: formMetadata,
        ...(selectedStoreId && { storeId: selectedStoreId })
      };

      await apiClientClient.post<any>('/integrations', payload);
      alert('Lưu cấu hình thành công!');
      fetchIntegration();
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || 'Lỗi khi lưu cấu hình');
    } finally {
      setIsSaving(false);
    }
  };

  const syncPancakeProducts = async () => {
    if (!confirm('Đồng bộ tất cả sản phẩm từ Pancake? Quá trình này có thể mất vài phút.')) {
      return;
    }

    setIsSyncing(true);
    setSyncMessage('Đang đồng bộ sản phẩm...');

    try {
      const data = await apiClientClient.post<any>('/integrations/pancake/sync-products', {
        storeId: selectedStoreId
      });

      setSyncMessage(data.message || 'Đồng bộ thành công!');
      setTimeout(() => setSyncMessage(''), 5000);
    } catch (error: any) {
      console.error(error);
      setSyncMessage(error.response?.data?.message || 'Lỗi khi đồng bộ sản phẩm');
      setTimeout(() => setSyncMessage(''), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const syncPancakeCategories = async () => {
    if (!confirm('Đồng bộ tất cả danh mục từ Pancake?')) {
      return;
    }

    setIsSyncingCategories(true);
    setSyncMessage('Đang đồng bộ danh mục...');

    try {
      const data = await apiClientClient.post<any>('/integrations/pancake/sync-categories', {});

      setSyncMessage(data.message || 'Đồng bộ danh mục thành công!');
      setTimeout(() => setSyncMessage(''), 5000);
    } catch (error: any) {
      console.error(error);
      setSyncMessage(error.response?.data?.message || 'Lỗi khi đồng bộ danh mục');
      setTimeout(() => setSyncMessage(''), 5000);
    } finally {
      setIsSyncingCategories(false);
    }
  };

  const formatDateInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getRelativeDate = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return formatDateInput(date);
  };

  const addOrderDate = (date: string) => {
    if (!date) return;
    setSelectedOrderDates(prev => (
      prev.includes(date) ? prev : [...prev, date].sort((a, b) => b.localeCompare(a))
    ));
  };

  const addOrderDateRange = (startDate: string, endDate: string) => {
    if (!startDate) return;

    const start = new Date(`${startDate}T00:00:00+07:00`);
    const end = new Date(`${(endDate || startDate)}T00:00:00+07:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

    const from = start <= end ? start : end;
    const to = start <= end ? end : start;
    const dates: string[] = [];
    const cursor = new Date(from);

    while (cursor <= to && dates.length < 31) {
      dates.push(formatDateInput(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    setSelectedOrderDates(prev => (
      Array.from(new Set([...prev, ...dates])).sort((a, b) => b.localeCompare(a))
    ));
  };

  const removeOrderDate = (date: string) => {
    setSelectedOrderDates(prev => prev.filter(item => item !== date));
  };

  const formatSelectedDate = (date: string) => {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(`${date}T00:00:00+07:00`));
  };

  const syncPancakeOrders = async () => {
    if (selectedOrderDates.length === 0) {
      setSyncMessage('Vui lòng chọn ít nhất một ngày để đồng bộ đơn hàng Pancake');
      setTimeout(() => setSyncMessage(''), 5000);
      return;
    }

    if (!confirm(`Đồng bộ đơn hàng Pancake trong ${selectedOrderDates.length} ngày đã chọn?`)) {
      return;
    }

    setIsSyncing(true);
    setSyncMessage('Đang quét và đồng bộ đơn hàng theo ngày đã chọn...');

    try {
      const data = await apiClientClient.post<any>('/integrations/pancake/sync-all-orders', {
        storeId: selectedStoreId,
        dates: selectedOrderDates,
      });

      setSyncMessage(`Đã đồng bộ ${data.synced} đơn hàng từ ${data.total || 0} đơn Pancake. Tổng tiền: ${(data.totalAmount || 0).toLocaleString()}đ`);
      setTimeout(() => setSyncMessage(''), 8000);
    } catch (error: any) {
      console.error(error);
      setSyncMessage(error.response?.data?.message || 'Lỗi khi đồng bộ đơn hàng');
      setTimeout(() => setSyncMessage(''), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const syncPancakeAllOrders = async () => {
    if (!confirm('Đồng bộ TẤT CẢ đơn hàng từ trước đến nay từ Pancake? Quá trình này có thể mất nhiều thời gian.')) {
      return;
    }

    setIsSyncing(true);
    setSyncMessage('Đang quét và đồng bộ TOÀN BỘ đơn hàng từ trước đến nay...');

    try {
      const data = await apiClientClient.post<any>('/integrations/pancake/sync-all-orders', {
        storeId: selectedStoreId,
        syncAll: true,
      });

      setSyncMessage(`Đã đồng bộ ${data.synced} đơn hàng mới. Tổng tiền: ${(data.totalAmount || 0).toLocaleString()}đ`);
      setTimeout(() => setSyncMessage(''), 8000);
    } catch (error: any) {
      console.error(error);
      setSyncMessage(error.response?.data?.message || 'Lỗi khi đồng bộ toàn bộ đơn hàng');
      setTimeout(() => setSyncMessage(''), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!platformInfo) {
    return <div className="p-8 text-center text-gray-500">Nền tảng không hợp lệ</div>;
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Đang tải cấu hình kết nối...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push('/admin/integrations')}
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${platformInfo.color} flex items-center justify-center text-xl text-white shadow-sm`}>
              {platformInfo.icon}
            </div>
            Chi tiết cấu hình {platformInfo.name}
          </h1>
          <p className="text-gray-600 mt-1">{platformInfo.desc}</p>
        </div>
      </div>

      {syncMessage && (
        <div className={`p-4 rounded-xl border ${syncMessage.includes('thành công') || syncMessage.includes('Đã đồng bộ') ? 'bg-green-50 border-green-200 text-green-800' : syncMessage.includes('Đang') ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <p className="font-semibold">{syncMessage}</p>
        </div>
      )}

      {platformId === 'PANCAKE' && formIsActive && (
        <div className="space-y-3 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-gray-300 transition-colors shadow-sm">
            <div>
              <h3 className="font-semibold text-gray-800 text-base">Đồng bộ danh mục Pancake</h3>
              <p className="text-gray-500 text-sm mt-0.5">Cập nhật hệ thống bằng dữ liệu danh mục mới nhất từ Pancake.</p>
            </div>
            <button
              onClick={syncPancakeCategories}
              disabled={isSyncingCategories}
              className="px-5 py-2.5 whitespace-nowrap bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncingCategories ? (
                <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-gray-400 border-t-transparent animate-spin"></span> Đang tải...</span>
              ) : 'Thực hiện đồng bộ'}
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-gray-300 transition-colors shadow-sm">
            <div>
              <h3 className="font-semibold text-gray-800 text-base">Đồng bộ sản phẩm Pancake</h3>
              <p className="text-gray-500 text-sm mt-0.5">Kéo toàn bộ sản phẩm từ Pancake và lưu vào cơ sở dữ liệu local.</p>
            </div>
            <button
              onClick={syncPancakeProducts}
              disabled={isSyncing}
              className="px-5 py-2.5 whitespace-nowrap bg-gray-900 hover:bg-gray-800 text-white border border-gray-900 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isSyncing ? (
                <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span> Đang tải...</span>
              ) : 'Đồng bộ sản phẩm'}
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors shadow-sm space-y-6">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="font-semibold text-gray-800 text-xl flex items-center gap-2">
                  📦 Đồng bộ đơn hàng Pancake
                </h3>
                <p className="text-gray-500 text-sm mt-1">
                  Kéo đơn hàng từ Pancake, tự động tạo khách hàng và tính toán doanh số, hạng thành viên.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={syncPancakeAllOrders}
                  disabled={isSyncing}
                  className="px-6 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  ✨ Đồng bộ tất cả đơn
                </button>
                <button 
                  onClick={syncPancakeOrders} 
                  disabled={isSyncing || selectedOrderDates.length === 0}
                  className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white border border-gray-900 rounded-lg text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isSyncing ? (
                    <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span> Đang chạy...</span>
                  ) : 'Đồng bộ ngày đã chọn'}
                </button>
              </div>
            </div>

            <div className="w-full space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-col gap-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Chọn ngày cần đồng bộ</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Hôm nay', date: getRelativeDate(0) },
                    { label: 'Hôm qua', date: getRelativeDate(1) },
                    { label: '3 ngày trước', date: getRelativeDate(3) },
                    { label: '7 ngày trước', date: getRelativeDate(7) },
                    { label: '30 ngày trước', date: getRelativeDate(30) },
                  ].map(option => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => addOrderDate(option.date)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-indigo-300 hover:text-indigo-700"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-3 border-t border-gray-200/50">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Hoặc chọn khoảng ngày</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="date"
                    value={customOrderDate}
                    onChange={e => setCustomOrderDate(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex items-center text-gray-400">đến</div>
                  <input
                    type="date"
                    value={customOrderEndDate}
                    onChange={e => setCustomOrderEndDate(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addOrderDateRange(customOrderDate, customOrderEndDate);
                      setCustomOrderDate('');
                      setCustomOrderEndDate('');
                    }}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700 shadow-sm"
                  >
                    Thêm khoảng ngày
                  </button>
                </div>
              </div>

              {selectedOrderDates.length > 0 && (
                <div className="flex flex-col gap-3 pt-3 border-t border-gray-200/50">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Danh sách ngày đã chọn ({selectedOrderDates.length})</label>
                    <button type="button" onClick={() => setSelectedOrderDates([])} className="text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors">
                      Xóa tất cả
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedOrderDates.map(date => (
                      <span key={date} className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm">
                        {formatSelectedDate(date)}
                        <button type="button" onClick={() => removeOrderDate(date)} className="text-indigo-300 hover:text-indigo-600 transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          ⚙️ Nhập khoá API (API Keys)
        </h2>
        <form onSubmit={saveConfig} className="space-y-5">
          {['PANCAKE'].includes(platformId) && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shop ID (Pancake)</label>
                <div className="relative">
                  <input type={showFields['shopId'] ? 'text' : 'password'} className="w-full border border-gray-300 rounded-xl pl-4 pr-12 py-3 outline-none focus:ring-2 focus:ring-indigo-500" value={formShopId} onChange={e => setFormShopId(e.target.value)} required />
                  <button type="button" onClick={() => toggleField('shopId')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showFields['shopId'] ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <div className="relative">
                  <input type={showFields['apiKey'] ? 'text' : 'password'} className="w-full border border-gray-300 rounded-xl pl-4 pr-12 py-3 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" value={formApiKey} onChange={e => setFormApiKey(e.target.value)} required />
                  <button type="button" onClick={() => toggleField('apiKey')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showFields['apiKey'] ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </>
          )}

          {['SHOPEE', 'TIKTOK', 'LAZADA'].includes(platformId) && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shop ID / Client ID</label>
                <div className="relative">
                  <input type={showFields['shopId'] ? 'text' : 'password'} className="w-full border border-gray-300 rounded-xl pl-4 pr-12 py-3 outline-none focus:ring-2 focus:ring-indigo-500" value={formShopId} onChange={e => setFormShopId(e.target.value)} />
                  <button type="button" onClick={() => toggleField('shopId')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showFields['shopId'] ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key / App Key</label>
                <div className="relative">
                  <input type={showFields['apiKey'] ? 'text' : 'password'} className="w-full border border-gray-300 rounded-xl pl-4 pr-12 py-3 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" value={formApiKey} onChange={e => setFormApiKey(e.target.value)} />
                  <button type="button" onClick={() => toggleField('apiKey')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showFields['apiKey'] ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">App Secret / API Secret</label>
                <div className="relative">
                  <input type={showFields['apiSecret'] ? 'text' : 'password'} className="w-full border border-gray-300 rounded-xl pl-4 pr-12 py-3 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" value={formApiSecret} onChange={e => setFormApiSecret(e.target.value)} />
                  <button type="button" onClick={() => toggleField('apiSecret')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showFields['apiSecret'] ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </>
          )}

          {['VIETTELPOST'].includes(platformId) && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Token (ViettelPost)</label>
                <div className="relative">
                  <input type={showFields['accessToken'] ? 'text' : 'password'} className="w-full border border-gray-300 rounded-xl pl-4 pr-12 py-3 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" value={formAccessToken} onChange={e => setFormAccessToken(e.target.value)} required />
                  <button type="button" onClick={() => toggleField('accessToken')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showFields['accessToken'] ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <p className="font-semibold text-gray-800 mb-3">Cấu hình địa chỉ gửi mặc định (Tính phí ship)</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh/Thành phố</label>
                      <input type="text" placeholder="VD: Hà Nội" className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" value={formMetadata?.senderProvince || ''} onChange={e => setFormMetadata({ ...formMetadata, senderProvince: e.target.value })} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phường/Xã</label>
                      <input type="text" placeholder="VD: Phường Dịch Vọng" className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" value={formMetadata?.senderWard || ''} onChange={e => setFormMetadata({ ...formMetadata, senderWard: e.target.value })} required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ chi tiết (Số nhà, Ngõ)</label>
                    <input type="text" className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500" value={formMetadata?.senderAddress || ''} onChange={e => setFormMetadata({ ...formMetadata, senderAddress: e.target.value })} required />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="pt-4">
            <label className="flex items-center gap-3 cursor-pointer p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="relative inline-flex items-center">
                <input type="checkbox" className="sr-only peer" checked={formIsActive} onChange={e => setFormIsActive(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </div>
              <div>
                <span className="font-semibold text-gray-800 block text-lg">Bật đồng bộ (Active)</span>
                <span className="text-gray-500 text-sm">Cho phép hệ thống sử dụng khoá API này để gọi dữ liệu</span>
              </div>
            </label>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <button type="submit" disabled={isSaving} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-transform active:scale-95 disabled:opacity-50 text-lg shadow-sm">
              {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
