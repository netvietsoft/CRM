'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { apiClientClient } from '@/lib/apiClientClient';
import {
  formatDateTime,
  messagingChannelOptions,
  SmsProviderConfigResponse,
} from '@/lib/adminMessaging';

const defaultForm = {
  name: '',
  apiUrl: '',
  brandName: '',
  user: '',
  pass: '',
  isActive: true,
  isDefault: true,
};

export default function CustomerCareSettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<SmsProviderConfigResponse | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [showPass, setShowPass] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState('SMS');

  const isSmsChannel = selectedChannel === 'SMS';

  useEffect(() => {
    let cancelled = false;

    void apiClientClient
      .get<SmsProviderConfigResponse>('/admin/messaging/sms-provider-config')
      .then((response) => {
        if (cancelled) {
          return;
        }

        setData(response);
        if (response.config) {
          setForm({
            name: response.config.name || '',
            apiUrl: response.config.apiUrl || '',
            brandName: response.config.brandName || '',
            user: response.config.user || '',
            pass: response.config.pass || '',
            isActive: response.config.isActive,
            isDefault: response.config.isDefault,
          });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          alert(error instanceof Error ? error.message : 'Không tải được cấu hình SMS');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await apiClientClient.put<SmsProviderConfigResponse>(
        '/admin/messaging/sms-provider-config',
        form,
      );
      setData(response);
      if (response.config) {
        setForm({
          name: response.config.name || '',
          apiUrl: response.config.apiUrl || '',
          brandName: response.config.brandName || '',
          user: response.config.user || '',
          pass: response.config.pass || '',
          isActive: response.config.isActive,
          isDefault: response.config.isDefault,
        });
      }
      alert('Đã lưu cấu hình SMS');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không lưu được cấu hình SMS');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3.5">
      <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
        <h1 className="text-lg font-extrabold text-gray-900">Cấu hình kênh gửi</h1>
        <p className="mt-1 text-[12.5px] text-[#9ca3af]">
          Quản lý cấu hình gửi tin theo từng kênh ngay trong admin. Hiện tại mới hỗ trợ cấu hình thực tế cho SMS.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] items-start">
        <form onSubmit={handleSave} className="rounded-[14px] border border-[#eceef2] bg-white p-[22px]">
          <label className="block">
            <div className="mb-1.5 text-[12.5px] font-bold text-gray-900">Kênh gửi</div>
            <select
              value={selectedChannel}
              onChange={(event) => setSelectedChannel(event.target.value)}
              className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
            >
              {messagingChannelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.disabled ? `${option.label} (chưa hỗ trợ)` : option.label}
                </option>
              ))}
            </select>
          </label>

          {!isSmsChannel ? (
            <div className="mt-5 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-[12.5px] text-[#b45309]">
              Kênh <span className="font-bold text-[#92400e]">{selectedChannel}</span> hiện đang ở trạng thái chờ hỗ trợ.
              Khi backend và provider của kênh này sẵn sàng, phần cấu hình chi tiết sẽ được mở tại đây.
            </div>
          ) : null}

          {!loading && !data?.config && isSmsChannel ? (
            <div className="mt-5 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-[12.5px] text-[#b45309]">
              Chưa có cấu hình SMS trong DB cho scope hiện tại. Các ô bên dưới đang để trống để bạn nhập cấu hình mới.
            </div>
          ) : null}

          <div className={`grid gap-4 grid-cols-[1.5fr_1fr] ${isSmsChannel ? 'mt-5' : 'mt-5 opacity-50'}`}>
            <label className="block">
              <div className="mb-1.5 text-[12.5px] font-bold text-gray-900">Tên cấu hình</div>
              <input
                disabled={!isSmsChannel}
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="SMS Provider"
                className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
              />
            </label>
            <label className="block">
              <div className="mb-1.5 text-[12.5px] font-bold text-gray-900">Brand name</div>
              <input
                disabled={!isSmsChannel}
                value={form.brandName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, brandName: event.target.value }))
                }
                placeholder="HTC"
                className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
              />
            </label>
          </div>

          <label className={`mt-4 block ${!isSmsChannel ? 'opacity-50' : ''}`}>
            <div className="mb-1.5 text-[12.5px] font-bold text-gray-900">API URL</div>
            <input
              disabled={!isSmsChannel}
              value={form.apiUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, apiUrl: event.target.value }))}
              placeholder="http://125.212.226.79:9020/service/sms_api"
              className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2.5 text-[13px] font-mono outline-none focus:border-[#2563eb]"
            />
          </label>

          <div className={`mt-4 grid gap-4 grid-cols-2 ${!isSmsChannel ? 'opacity-50' : ''}`}>
            <label className="block">
              <div className="mb-1.5 text-[12.5px] font-bold text-gray-900">API User</div>
              <input
                disabled={!isSmsChannel}
                value={form.user}
                onChange={(event) => setForm((prev) => ({ ...prev, user: event.target.value }))}
                placeholder="SMS API user"
                className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2.5 text-[13px] outline-none focus:border-[#2563eb]"
              />
            </label>
            <label className="block">
              <div className="mb-1.5 text-[12.5px] font-bold text-gray-900">API Pass</div>
              <div className="relative">
                <input
                  disabled={!isSmsChannel}
                  type={showPass ? 'text' : 'password'}
                  value={form.pass}
                  onChange={(event) => setForm((prev) => ({ ...prev, pass: event.target.value }))}
                  placeholder="SMS API password"
                  className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2.5 pr-11 text-[13px] outline-none focus:border-[#2563eb]"
                />
                <button
                  type="button"
                  disabled={!isSmsChannel}
                  onClick={() => setShowPass((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#6b7280] hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
          </div>

          <div className={`mt-5 flex flex-wrap gap-6 ${!isSmsChannel ? 'opacity-50' : ''}`}>
            <label className="inline-flex items-center gap-2 text-[13px] text-gray-900">
              <input
                disabled={!isSmsChannel}
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                }
                className="accent-[#2563eb]"
              />
              Bật cấu hình này
            </label>
            <label className="inline-flex items-center gap-2 text-[13px] text-gray-900">
              <input
                disabled={!isSmsChannel}
                type="checkbox"
                checked={form.isDefault}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, isDefault: event.target.checked }))
                }
                className="accent-[#2563eb]"
              />
              Đặt làm mặc định cho scope hiện tại
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving || !isSmsChannel}
              className="rounded-[10px] bg-[#2563eb] px-5 py-3 text-sm font-bold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {!isSmsChannel ? 'Kênh đang chờ hỗ trợ' : saving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </div>
        </form>

        <div className="flex flex-col gap-4">
          <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
            <h2 className="text-[14px] font-extrabold text-gray-900">Trạng thái hiện tại</h2>
            {!isSmsChannel ? (
              <div className="mt-4 rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-[12.5px] text-[#6b7280]">
                Kênh {selectedChannel} chưa có trạng thái vận hành vì chưa được tích hợp provider.
              </div>
            ) : loading ? (
              <div className="mt-4 text-[12.5px] text-[#9ca3af]">Đang tải...</div>
            ) : (
              <div className="mt-4 space-y-3 text-[13px] text-[#4b5563]">
                <div>
                  <span className="font-bold text-gray-900">Scope:</span> {data?.scope || 'GLOBAL'}
                </div>
                <div>
                  <span className="font-bold text-gray-900">Nguồn đang dùng:</span>{' '}
                  {data?.health.source || 'NONE'}
                </div>
                <div>
                  <span className="font-bold text-gray-900">Provider key:</span>{' '}
                  <span className="font-mono">{data?.health.providerKey || '—'}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-900">Health:</span>{' '}
                  {data?.health.configured ? (
                    <span className="font-bold text-[#059669]">OK</span>
                  ) : (
                    <span className="font-bold text-[#dc2626]">Thiếu config</span>
                  )}
                </div>
                <div>
                  <span className="font-bold text-gray-900">Cập nhật:</span>{' '}
                  {data?.config?.updatedAt ? formatDateTime(data.config.updatedAt) : 'Chưa có cấu hình trong DB'}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[14px] border border-[#eceef2] bg-white p-5">
            <h2 className="text-[14px] font-extrabold text-gray-900">Cảnh báo</h2>
            <div className="mt-4 space-y-2 text-[12.5px]">
              {!isSmsChannel ? (
                <div className="rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-[#6b7280]">
                  Chưa có cảnh báo cấu hình cho kênh này vì hệ thống chưa mở hỗ trợ.
                </div>
              ) : data?.health.warnings?.length ? (
                data.health.warnings.map((warning) => (
                  <div key={warning} className="rounded-[10px] border border-[#fde68a] bg-[#fffbeb] px-3.5 py-2.5 text-[#b45309]">
                    {warning}
                  </div>
                ))
              ) : (
                <div className="rounded-[10px] border border-[#a7f3d0] bg-[#ecfdf5] px-3.5 py-2.5 font-semibold text-[#047857]">
                  Không có cảnh báo cấu hình.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
