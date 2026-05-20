'use client';

import { useState } from 'react';
import Select from '@/components/ui/Select';
import { Send } from 'lucide-react';
import { apiClientClient } from '@/lib/apiClientClient';

export default function ContactFormClient() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.subject) {
      setError('Vui lòng chọn chủ đề cần hỗ trợ');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClientClient.post('/support/contact', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        subject: formData.subject,
        message: formData.message.trim(),
      });
      setIsSubmitting(false);
      setSubmitted(true);
      setError('');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (submitError) {
      setIsSubmitting(false);
      setError(submitError instanceof Error ? submitError.message : 'Không thể gửi yêu cầu hỗ trợ lúc này');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (error) setError('');
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubjectChange = (value: string) => {
    if (error) setError('');
    setFormData(prev => ({ ...prev, subject: value }));
  };

  const subjectOptions = [
    { value: 'payment', label: 'Vấn đề thanh toán' },
    { value: 'voucher', label: 'Vấn đề voucher' },
    { value: 'login', label: 'Vấn đề đăng nhập' },
    { value: 'order', label: 'Vấn đề về đơn hàng' },
    { value: 'product', label: 'Tư vấn sản phẩm' },
    { value: 'warranty', label: 'Bảo hành & Đổi trả' },
    { value: 'account', label: 'Vấn đề về tài khoản' },
    { value: 'other', label: 'Vấn đề khác' },
  ];

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
      {error && (
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
            !
          </div>
          <div>
            <h4 className="font-semibold">Không thể gửi yêu cầu</h4>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        </div>
      )}

      {submitted && (
        <div className="mb-8 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Check size={16} className="text-green-600" />
          </div>
          <div>
            <h4 className="font-semibold">Đã gửi tin nhắn thành công!</h4>
            <p className="text-sm opacity-90">Chúng tôi sẽ phản hồi bạn qua email trong thời gian sớm nhất.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Họ và tên *</label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            placeholder="Ví dụ: Nguyễn Văn A"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại *</label>
          <input
            type="tel"
            name="phone"
            required
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            placeholder="Ví dụ: 0987654321"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            placeholder="Ví dụ: email@domain.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Chủ đề cần hỗ trợ *</label>
          <Select
            options={subjectOptions}
            value={formData.subject}
            onChange={handleSubjectChange}
            placeholder="-- Chọn chủ đề --"
          />
        </div>
      </div>

      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung chi tiết *</label>
        <textarea
          name="message"
          required
          value={formData.message}
          onChange={handleChange}
          rows={5}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
          placeholder="Vui lòng mô tả chi tiết vấn đề bạn đang gặp phải..."
        ></textarea>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full py-4 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-md ${
          isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg hover:-translate-y-0.5'
        }`}
      >
        {isSubmitting ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Đang gửi...
          </>
        ) : (
          <>
            <Send size={20} />
            Gửi yêu cầu hỗ trợ
          </>
        )}
      </button>
    </form>
  );
}

function Check({ size, className }: { size: number, className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}
