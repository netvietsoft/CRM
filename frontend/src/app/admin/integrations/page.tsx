'use client';
export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { apiClientClient } from '@/lib/apiClientClient';
import type { Integration, IntegrationMetadata } from '@/types/integrations';
import FacebookConnectCard from '@/components/admin/FacebookConnectCard';

interface CurrentUser {
  role?: string;
}

const PLATFORMS = [
  { id: 'PANCAKE', name: 'Pancake Pos', icon: '🥞', color: 'bg-orange-500', desc: 'Đồng bộ đơn hàng, kho hàng đa kênh' },
  { id: 'SHOPEE', name: 'Shopee', icon: '🛍️', color: 'bg-orange-600', desc: 'Đồng bộ tự động đơn hàng Shopee' },
  { id: 'TIKTOK', name: 'TikTok Shop', icon: '🎵', color: 'bg-black', desc: 'Kết nối kho vận TikTok Shop' },
  { id: 'ZALO', name: 'Zalo OA', icon: '💬', color: 'bg-blue-500', desc: 'Gửi tin nhắn chăm sóc tự động' },
  { id: 'VIETTELPOST', name: 'ViettelPost', icon: '📦', color: 'bg-red-600', desc: 'Vận chuyển & đẩy đơn · nhiều tài khoản đồng bộ về CRM' },
  { id: 'META_ADS', name: 'Meta Ads', icon: '📣', color: 'bg-blue-600', desc: 'Kéo chiến dịch & chỉ số quảng cáo Facebook/Instagram' },
  { id: 'WHATSAPP', name: 'WhatsApp Business', icon: '🟢', color: 'bg-green-600', desc: 'WABA — quản lý & nhắn tin WhatsApp (whatsapp_business_management)' },
];

export default function IntegrationsPage() {
  const router = useRouter();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedStoreId = '';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState('');
  const [userRole, setUserRole] = useState<string>('MODERATOR');

  // Form states
  const [formApiKey, setFormApiKey] = useState('');
  const [formApiSecret, setFormApiSecret] = useState('');
  const [formShopId, setFormShopId] = useState('');
  const [formAccessToken, setFormAccessToken] = useState('');
  const [formIsActive, setFormIsActive] = useState(false);
  const [formMetadata, setFormMetadata] = useState<IntegrationMetadata>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showFields, setShowFields] = useState<Record<string, boolean>>({});

  // Facebook OAuth: card vuông trong lưới, bấm mở modal chi tiết (FacebookConnectCard).
  const [fbOpen, setFbOpen] = useState(false);
  const [fbActive, setFbActive] = useState(false);
  useEffect(() => {
    apiClientClient.get<Array<{ status: string }>>('/integrations/facebook/connections')
      .then(cs => setFbActive(Array.isArray(cs) && cs.some(c => c.status === 'ACTIVE')))
      .catch(() => setFbActive(false));
    // FB redirect về kèm ?fb=ok|error → mở sẵn modal để thấy thông báo.
    if (window.location.search.includes('fb=')) setFbOpen(true);
  }, []);

  const toggleField = (field: string) => {
    setShowFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const loadIntegrations = useCallback(async () => {
    const [integrationsData, userProfile] = await Promise.all([
      apiClientClient.get<Integration[]>('/integrations', {
        params: { storeId: selectedStoreId }
      }),
      apiClientClient.get<CurrentUser>('/users/me')
    ]);

    return {
      integrations: integrationsData,
      role: userProfile?.role || 'MODERATOR',
    };
  }, [selectedStoreId]);

  useEffect(() => {
    let isCancelled = false;

    void loadIntegrations()
      .then((data) => {
        if (isCancelled) return;
        setIntegrations(data.integrations || []);
        setUserRole(data.role);
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [loadIntegrations]);

  const openConfig = (platformId: string) => {
    const existing = integrations.find(i => i.platform === platformId);
    setActivePlatform(platformId);
    setFormApiKey(existing?.apiKey || '');
    setFormApiSecret(existing?.apiSecret || '');
    setFormShopId(existing?.shopId || '');
    setFormAccessToken(existing?.accessToken || '');
    setFormIsActive(existing?.isActive || false);
    setFormMetadata(existing?.metadata || {});
    setShowFields({}); // Reset visibility on open
    setIsModalOpen(true);
  };

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        platform: activePlatform,
        apiKey: formApiKey,
        apiSecret: formApiSecret,
        shopId: formShopId,
        accessToken: formAccessToken,
        isActive: formIsActive,
        metadata: formMetadata,
        ...(selectedStoreId ? { storeId: selectedStoreId } : {})
      };

      await apiClientClient.post<Integration>('/integrations', payload);
      const data = await loadIntegrations();
      setIntegrations(data.integrations || []);
      setUserRole(data.role);
      setIsModalOpen(false);
      alert('Lưu cấu hình thành công!');
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Lỗi khi lưu cấu hình');
    } finally {
      setIsSaving(false);
    }
  };


  if (loading) return <div className="p-8 text-center text-gray-500">Đang tải cấu hình kết nối...</div>;

  const allowedPlatforms = PLATFORMS.filter(p => {
    if (p.id === 'VIETTELPOST' && userRole === 'MODERATOR') return false;
    return true;
  });

  const connectedPlatforms = allowedPlatforms.filter(p => integrations.some(i => i.platform === p.id));
  const availablePlatforms = allowedPlatforms.filter(p => !integrations.some(i => i.platform === p.id));

  const renderPlatformCard = (platform: typeof PLATFORMS[0]) => {
    const config = integrations.find(i => i.platform === platform.id);
    const isConnected = !!config;
    const isActive = config?.isActive;

    return (
      <div
        key={platform.id}
        onClick={() => router.push(`/admin/integrations/${platform.id.toLowerCase()}`)}
        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all flex flex-col h-full group"
      >
        <div className="flex items-start justify-between mb-4">
          <div className={`w-14 h-14 rounded-2xl ${platform.color} flex items-center justify-center text-2xl text-white shadow-md group-hover:scale-105 transition-transform`}>
            {platform.icon}
          </div>
          {isConnected ? (
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              {isActive ? '• HOẠT ĐỘNG' : 'TẠM DỪNG'}
            </span>
          ) : (
            <span className="px-3 py-1 bg-gray-50 text-gray-500 rounded-full text-xs font-semibold border border-gray-200">
              Sẵn sàng
            </span>
          )}
        </div>

        <h3 className="font-bold text-gray-900 text-lg">{platform.name}</h3>
        <p className="text-sm text-gray-500 mt-1 mb-6 flex-1">{platform.desc}</p>

        <button
          onClick={(e) => { e.stopPropagation(); openConfig(platform.id); }}
          className={`w-full py-2.5 rounded-xl font-semibold transition-colors ${isConnected
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
        >
          {isConnected ? '⚙️ Cấu hình' : '⊕ Kết nối ngay'}
        </button>
      </div>
    );
  };

  // Card vuông Facebook (đồng bộ layout với renderPlatformCard) — bấm mở modal chi tiết.
  const facebookCard = (
    <div
      key="FACEBOOK_OAUTH"
      onClick={() => setFbOpen(true)}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all flex flex-col h-full group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-14 h-14 rounded-2xl bg-[#1877f2] flex items-center justify-center text-2xl text-white font-bold shadow-md group-hover:scale-105 transition-transform">f</div>
        {fbActive ? (
          <span className="px-3 py-1 rounded-full text-xs font-bold border bg-green-50 text-green-700 border-green-200">• HOẠT ĐỘNG</span>
        ) : (
          <span className="px-3 py-1 bg-gray-50 text-gray-500 rounded-full text-xs font-semibold border border-gray-200">Sẵn sàng</span>
        )}
      </div>
      <h3 className="font-bold text-gray-900 text-lg">Facebook (OAuth)</h3>
      <p className="text-sm text-gray-500 mt-1 mb-6 flex-1">Đa BM: Page · Ads · Messenger. Token lưu mã hoá.</p>
      <button
        onClick={(e) => { e.stopPropagation(); setFbOpen(true); }}
        className="w-full py-2.5 rounded-xl font-semibold transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200"
      >
        ⚙️ Cấu hình
      </button>
    </div>
  );

  return (
    <div className="w-full space-y-8">
      {/* Connected Platforms (+ Facebook OAuth card) */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          Cấu hình
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {facebookCard}
          {connectedPlatforms.map(renderPlatformCard)}
        </div>
      </div>

      {/* Available Platforms */}
      {availablePlatforms.length > 0 && (
        <div className="space-y-4 pt-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            Cài đặt cấu hình
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 opacity-90">
            {availablePlatforms.map(renderPlatformCard)}
          </div>
        </div>
      )}

      {/* Facebook OAuth Modal (card chi tiết: kết nối + danh sách connection) */}
      {fbOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setFbOpen(false); }}>
          <div className="w-full max-w-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setFbOpen(false)} className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white shadow-md text-gray-500 hover:text-gray-800 grid place-items-center">✕</button>
            <FacebookConnectCard />
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                Cấu hình {PLATFORMS.find(p => p.id === activePlatform)?.name}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={saveConfig} className="p-6 space-y-4">
              {['PANCAKE'].includes(activePlatform) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shop ID (Pancake)</label>
                    <div className="relative">
                      <input type={showFields['shopId'] ? 'text' : 'password'} className="w-full border border-gray-300 rounded-lg pl-4 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500" value={formShopId} onChange={e => setFormShopId(e.target.value)} required />
                      <button type="button" onClick={() => toggleField('shopId')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showFields['shopId'] ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                    <div className="relative">
                      <input type={showFields['apiKey'] ? 'text' : 'password'} className="w-full border border-gray-300 rounded-lg pl-4 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" value={formApiKey} onChange={e => setFormApiKey(e.target.value)} required />
                      <button type="button" onClick={() => toggleField('apiKey')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showFields['apiKey'] ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* TIKTOK / SHOPEE might use access token or api secret */}
              {['SHOPEE', 'TIKTOK', 'LAZADA'].includes(activePlatform) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shop ID / Client ID</label>
                    <div className="relative">
                      <input type={showFields['shopId'] ? 'text' : 'password'} className="w-full border border-gray-300 rounded-lg pl-4 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500" value={formShopId} onChange={e => setFormShopId(e.target.value)} />
                      <button type="button" onClick={() => toggleField('shopId')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showFields['shopId'] ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API Key / App Key</label>
                    <div className="relative">
                      <input type={showFields['apiKey'] ? 'text' : 'password'} className="w-full border border-gray-300 rounded-lg pl-4 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" value={formApiKey} onChange={e => setFormApiKey(e.target.value)} />
                      <button type="button" onClick={() => toggleField('apiKey')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showFields['apiKey'] ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">App Secret / API Secret</label>
                    <div className="relative">
                      <input type={showFields['apiSecret'] ? 'text' : 'password'} className="w-full border border-gray-300 rounded-lg pl-4 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" value={formApiSecret} onChange={e => setFormApiSecret(e.target.value)} />
                      <button type="button" onClick={() => toggleField('apiSecret')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showFields['apiSecret'] ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {['VIETTELPOST'].includes(activePlatform) && (
                <>
                  {/* Lối vào trang đầy đủ: quản lý NHIỀU tài khoản VTP (đồng bộ lịch sử + COD về CRM) */}
                  <button
                    type="button"
                    onClick={() => { setIsModalOpen(false); router.push('/admin/integrations/viettelpost'); }}
                    className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors"
                  >
                    <span className="text-sm font-semibold text-indigo-700">👥 Tài khoản VTP phụ — đồng bộ nhiều shop về CRM</span>
                    <span className="text-indigo-400">→</span>
                  </button>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Token (ViettelPost)</label>
                    <div className="relative">
                      <input type={showFields['accessToken'] ? 'text' : 'password'} className="w-full border border-gray-300 rounded-lg pl-4 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" value={formAccessToken} onChange={e => setFormAccessToken(e.target.value)} required />
                      <button type="button" onClick={() => toggleField('accessToken')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showFields['accessToken'] ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <p className="font-semibold text-gray-800 text-sm mb-3">Cấu hình địa chỉ gửi mặc định (Tính phí ship)</p>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Tỉnh/Thành phố</label>
                          <input type="text" placeholder="VD: Hà Nội" className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={formMetadata?.senderProvince || ''} onChange={e => setFormMetadata({ ...formMetadata, senderProvince: e.target.value })} required />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Phường/Xã</label>
                          <input type="text" placeholder="VD: Phường Dịch Vọng" className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={formMetadata?.senderWard || ''} onChange={e => setFormMetadata({ ...formMetadata, senderWard: e.target.value })} required />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Địa chỉ chi tiết (Số nhà, Ngõ)</label>
                        <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={formMetadata?.senderAddress || ''} onChange={e => setFormMetadata({ ...formMetadata, senderAddress: e.target.value })} required />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {['WHATSAPP'].includes(activePlatform) && (
                <>
                  <div className="rounded-xl border border-green-100 bg-green-50 p-3 text-xs text-green-800">
                    Token cần các quyền: <b>whatsapp_business_management</b> (quản lý WABA) + <b>whatsapp_business_messaging</b> (gửi/nhận tin).
                    Lấy ở App Meta → API Setup của WhatsApp, hoặc System User token trong Business Settings.
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Access Token (WhatsApp)</label>
                    <div className="relative">
                      <input type={showFields['accessToken'] ? 'text' : 'password'} className="w-full border border-gray-300 rounded-lg pl-4 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" value={formAccessToken} onChange={e => setFormAccessToken(e.target.value)} required />
                      <button type="button" onClick={() => toggleField('accessToken')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showFields['accessToken'] ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">WABA ID <span className="text-gray-400 font-normal">(WhatsApp Business Account ID)</span></label>
                    <input type="text" placeholder="VD: 102290129340398" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" value={formShopId} onChange={e => setFormShopId(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number ID <span className="text-gray-400 font-normal">— tuỳ chọn</span></label>
                    <input type="text" placeholder="VD: 106540352242922" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" value={formApiKey} onChange={e => setFormApiKey(e.target.value)} />
                    <p className="text-xs text-gray-500 mt-1">ID số điện thoại gửi tin (API Setup → Phone numbers). Để trống nếu chỉ cần quản lý WABA.</p>
                  </div>
                </>
              )}

              {['META_ADS'].includes(activePlatform) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Access Token (Meta)</label>
                    <div className="relative">
                      <input type={showFields['accessToken'] ? 'text' : 'password'} className="w-full border border-gray-300 rounded-lg pl-4 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" value={formAccessToken} onChange={e => setFormAccessToken(e.target.value)} required />
                      <button type="button" onClick={() => toggleField('accessToken')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showFields['accessToken'] ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business ID (BM) <span className="text-gray-400 font-normal">— tuỳ chọn</span></label>
                    <input type="text" placeholder="VD: 123456789012345" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" value={formMetadata?.businessId || ''} onChange={e => setFormMetadata({ ...formMetadata, businessId: e.target.value })} />
                    <p className="text-xs text-gray-500 mt-1">Có Business ID → tự lấy <b>tất cả</b> ad account trong BM (owned + client).</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ad Account ID <span className="text-gray-400 font-normal">— tuỳ chọn</span></label>
                    <input type="text" placeholder="act_123, act_456 (để trống = lấy tất cả)" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" value={formMetadata?.adAccountId || ''} onChange={e => setFormMetadata({ ...formMetadata, adAccountId: e.target.value })} />
                    <p className="text-xs text-gray-500 mt-1">Để trống = lấy tất cả tài khoản token truy cập được. Nhiều tài khoản: ngăn cách dấu phẩy.</p>
                  </div>
                  <p className="text-xs text-gray-500">Token cần quyền <span className="font-mono">ads_read</span>. Lấy ở Business Settings → System Users → Generate Token. Bật “Active” rồi vào trang Quảng cáo bấm “Đồng bộ ngay”.</p>
                </>
              )}

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="relative inline-flex items-center">
                    <input type="checkbox" className="sr-only peer" checked={formIsActive} onChange={e => setFormIsActive(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  </div>
                  <span className="font-semibold text-gray-800 text-sm">Bật đồng bộ (Active)</span>
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors">
                  Hủy
                </button>
                <button type="submit" disabled={isSaving} className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-transform active:scale-95 disabled:opacity-50">
                  {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
