'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { apiClientClient } from '@/lib/apiClientClient';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

const EMPTY = { current: '', next: '', confirm: '' };

export default function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const [form, setForm] = useState(EMPTY);
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Reset khi đóng/mở lại
  useEffect(() => {
    if (!open) {
      setForm(EMPTY);
      setShow({ current: false, next: false, confirm: false });
      setMsg(null);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!form.current || !form.next || !form.confirm) {
      setMsg({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin' });
      return;
    }
    if (form.next.length < 6) {
      setMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
      return;
    }
    if (form.next !== form.confirm) {
      setMsg({ type: 'error', text: 'Xác nhận mật khẩu mới không khớp' });
      return;
    }
    if (form.next === form.current) {
      setMsg({ type: 'error', text: 'Mật khẩu mới phải khác mật khẩu hiện tại' });
      return;
    }

    setLoading(true);
    try {
      await apiClientClient.put('/users/password', {
        currentPassword: form.current,
        newPassword: form.next,
      });
      setMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      setForm(EMPTY);
      setTimeout(onClose, 1200);
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Đổi mật khẩu thất bại' });
    } finally {
      setLoading(false);
    }
  };

  const field = (
    key: 'current' | 'next' | 'confirm',
    label: string,
    placeholder: string,
  ) => (
    <div>
      <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">{label}</label>
      <div className="relative">
        <input
          type={show[key] ? 'text' : 'password'}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-3.5 py-2.5 pr-11 text-[14px] text-[#111827] placeholder-[#9ca3af] transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          autoComplete={key === 'current' ? 'current-password' : 'new-password'}
        />
        <button
          type="button"
          onClick={() => setShow((s) => ({ ...s, [key]: !s[key] }))}
          aria-label={show[key] ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#9ca3af] transition hover:bg-[#eff6ff] hover:text-[#2563eb]"
        >
          {show[key] ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[16px] border border-[#eceef2] bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[16px] font-extrabold text-[#111827]">
            🔒 Đổi mật khẩu
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9ca3af] transition hover:bg-[#f3f4f6] hover:text-[#374151]"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        {msg && (
          <div
            className={`mb-4 rounded-lg border px-3.5 py-2.5 text-[13px] ${
              msg.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {field('current', 'Mật khẩu hiện tại', 'Nhập mật khẩu hiện tại')}
          {field('next', 'Mật khẩu mới', 'Ít nhất 6 ký tự')}
          {field('confirm', 'Xác nhận mật khẩu mới', 'Nhập lại mật khẩu mới')}

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-[10px] border border-[#e5e7eb] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#374151] transition hover:bg-[#f9fafb]"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-[10px] bg-[#2563eb] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#1d4ed8] disabled:opacity-50"
            >
              {loading ? 'Đang đổi…' : 'Đổi mật khẩu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
