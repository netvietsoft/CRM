'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { apiClientClient } from '@/lib/apiClientClient';

export interface UtilityTemplate {
  id: string;
  name: string;
  category: string;
  tag: 'POST_PURCHASE_UPDATE' | 'CONFIRMED_EVENT_UPDATE' | 'ACCOUNT_UPDATE';
  content: string;
  defaultParams: Record<string, string>;
}

export const PRESET_TEMPLATES: UtilityTemplate[] = [
  {
    id: 'order_confirmation',
    name: 'Xác nhận đơn hàng (Order Confirmation Template)',
    category: 'Post-Purchase Utility',
    tag: 'POST_PURCHASE_UPDATE',
    content:
      'Hello {{customer_name}}! Your order #{{order_id}} (Total: {{total_amount}}) has been confirmed. Express delivery is being prepared for you!',
    defaultParams: {
      customer_name: 'Nguyen Thu Ha',
      order_id: 'ORD-8899',
      total_amount: '450,000 VND',
    },
  },
  {
    id: 'shipping_update',
    name: 'Cập nhật vận chuyển (Shipping & Tracking Update)',
    category: 'Post-Purchase Utility',
    tag: 'POST_PURCHASE_UPDATE',
    content:
      'Hello {{customer_name}}, your order #{{order_id}} has been shipped via {{carrier}}. Tracking ID: {{tracking_code}}. Estimated delivery: 1-2 business days.',
    defaultParams: {
      customer_name: 'Nguyen Thu Ha',
      order_id: 'ORD-8899',
      carrier: 'ViettelPost',
      tracking_code: 'VTP123456789VN',
    },
  },
  {
    id: 'support_ticket',
    name: 'Cập nhật hỗ trợ khách hàng (Support Ticket / Event Update)',
    category: 'Account / Event Utility',
    tag: 'CONFIRMED_EVENT_UPDATE',
    content:
      'Hello {{customer_name}}, your support ticket #{{ticket_id}} status has been updated to: {{status}}. Please reply if you need further assistance.',
    defaultParams: {
      customer_name: 'Nguyen Thu Ha',
      ticket_id: 'TCK-2026',
      status: 'RESOLVED',
    },
  },
  {
    id: 'custom',
    name: 'Tùy chỉnh mẫu tin (Custom Utility / Marketing Template)',
    category: 'Custom Template',
    tag: 'POST_PURCHASE_UPDATE',
    content: 'Hello {{customer_name}}, update regarding order #{{order_id}}: {{custom_message}}.',
    defaultParams: {
      customer_name: 'Nguyen Thu Ha',
      order_id: 'ORD-8899',
      custom_message: 'Your package is ready for pickup at our store',
    },
  },
];

interface UtilityTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  recipientName?: string;
  onSuccess?: (renderedText: string, tag: string) => void;
}

export function UtilityTemplateModal({
  isOpen,
  onClose,
  conversationId,
  recipientName,
  onSuccess,
}: UtilityTemplateModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('order_confirmation');
  const [customContent, setCustomContent] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('POST_PURCHASE_UPDATE');
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedTemplate = useMemo(() => {
    return PRESET_TEMPLATES.find((t) => t.id === selectedTemplateId) || PRESET_TEMPLATES[0];
  }, [selectedTemplateId]);

  // Khi chọn template mới hoặc khi mở modal, khởi tạo params
  useEffect(() => {
    if (!isOpen) return;
    const initialParams = { ...selectedTemplate.defaultParams };
    if (recipientName) {
      initialParams.customer_name = recipientName;
    }
    setParamValues(initialParams);
    setSelectedTag(selectedTemplate.tag);
    if (selectedTemplate.id === 'custom') {
      setCustomContent(selectedTemplate.content);
    }
    setErrorMsg(null);
  }, [isOpen, selectedTemplate, recipientName]);

  // Trích xuất danh sách placeholders: {{variable_name}}
  const contentTemplate = selectedTemplateId === 'custom' ? customContent : selectedTemplate.content;
  const placeholders = useMemo(() => {
    const matches = contentTemplate.match(/\{\{([a-zA-Z0-9_-]+)\}\}/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '').trim())));
  }, [contentTemplate]);

  // Tính toán nội dung preview sau khi điền placeholders
  const renderedMessage = useMemo(() => {
    let result = contentTemplate;
    for (const p of placeholders) {
      const val = paramValues[p] !== undefined ? paramValues[p] : `[${p}]`;
      result = result.replaceAll(`{{${p}}}`, val);
    }
    return result;
  }, [contentTemplate, placeholders, paramValues]);

  const handleParamChange = (key: string, value: string) => {
    setParamValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSend = async () => {
    if (!renderedMessage.trim()) {
      setErrorMsg('Nội dung tin nhắn không được để trống (Message cannot be empty).');
      return;
    }
    setLoading(true);
    setErrorMsg(null);

    // Hỗ trợ chế độ Demo App Review (conversationId bắt đầu bằng demo-)
    if (conversationId.startsWith('demo-')) {
      if (onSuccess) onSuccess(renderedMessage, selectedTag);
      setLoading(false);
      onClose();
      return;
    }

    try {
      await apiClientClient.post(`/messenger/conversations/${conversationId}/utility-message`, {
        text: renderedMessage,
        tag: selectedTag,
      });
      if (onSuccess) onSuccess(renderedMessage, selectedTag);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gửi tin nhắn mẫu tiện ích thất bại.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      data-testid="utility-template-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center font-bold text-lg">
              📋
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Mẫu Tin Tiện Ích · Utility & Marketing Message Template
              </h2>
              <p className="text-xs text-blue-100">
                Meta Permissions: <strong>pages_utility_messaging</strong> & <strong>paid_marketing_messages</strong> (Send API with Placeholders)
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="utility-modal-close-btn"
            onClick={onClose}
            title="Close modal / Đóng cửa sổ"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div
              data-testid="utility-modal-error"
              className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2"
            >
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Chọn Template */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              1. Chọn Hoặc Tạo Mẫu Tin (Select or Create Utility / Marketing Template)
            </label>
            <select
              data-testid="utility-template-select"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              title="Choose a predefined utility/marketing message template or create a custom one"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            >
              {PRESET_TEMPLATES.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  [{tpl.category}] {tpl.name}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Template Content Editor (nếu chọn Custom) */}
          {selectedTemplateId === 'custom' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Nội dung mẫu tùy chỉnh · Custom Template Body (Use {'{{variable}}'} for placeholders)
              </label>
              <textarea
                data-testid="utility-custom-textarea"
                rows={2}
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* 2. Điền Placeholders */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              2. Điền Dữ Liệu Biến (Populate Template Placeholders: Name, Order ID, Tracking...)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
              {placeholders.length === 0 ? (
                <div className="col-span-2 text-xs text-gray-500 italic">
                  Mẫu tin không có biến placeholders (No placeholders in template).
                </div>
              ) : (
                placeholders.map((key) => (
                  <div key={key}>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      Placeholder Variable: <span className="font-mono text-blue-600">{`{{${key}}}`}</span>
                    </label>
                    <input
                      type="text"
                      data-testid={`placeholder-input-${key}`}
                      value={paramValues[key] || ''}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      placeholder={`Enter ${key}...`}
                      title={`Populate placeholder {{${key}}}`}
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cấu hình Tag */}
          <div className="flex items-center justify-between text-xs bg-blue-50/60 border border-blue-100 p-3 rounded-xl gap-2 flex-wrap">
            <span className="font-semibold text-blue-900">
              Meta Message Tag (messaging_type: MESSAGE_TAG):
            </span>
            <select
              data-testid="utility-tag-select"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              title="Select Meta Graph API Message Tag"
              className="bg-white border border-blue-200 text-blue-800 text-xs rounded-lg px-2.5 py-1 font-semibold focus:outline-none"
            >
              <option value="POST_PURCHASE_UPDATE">POST_PURCHASE_UPDATE (Order & Shipping Updates)</option>
              <option value="CONFIRMED_EVENT_UPDATE">CONFIRMED_EVENT_UPDATE (Event & Support Updates)</option>
              <option value="ACCOUNT_UPDATE">ACCOUNT_UPDATE (Account Status Updates)</option>
            </select>
          </div>

          {/* 3. Xem trước Tin nhắn (Live Preview) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                3. Xem Trước Tin Nhắn Trực Tiếp (Live Native Messenger Preview)
              </label>
              <span className="text-[11px] text-gray-500">
                Delivered view in Messenger client · Hiển thị phía khách
              </span>
            </div>
            <div className="bg-gray-100 p-4 rounded-2xl border border-gray-200">
              <div className="flex items-start gap-2 max-w-[85%] ml-auto justify-end">
                <div className="bg-blue-600 text-white rounded-2xl rounded-tr-xs px-4 py-2.5 text-sm shadow-sm space-y-1">
                  <p data-testid="utility-live-preview" className="whitespace-pre-wrap leading-relaxed">
                    {renderedMessage}
                  </p>
                  <div className="text-[10px] text-blue-200 flex items-center justify-end gap-1.5 pt-0.5">
                    <span className="font-mono">Tag: {selectedTag}</span>
                    <span>✓✓ Delivered to Messenger</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Hủy bỏ (Cancel)
          </button>
          <button
            type="button"
            data-testid="utility-send-btn"
            onClick={handleSend}
            disabled={loading}
            title="Send populated utility template message to recipient on Messenger"
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang gửi (Sending)...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Gửi Tin Tiện Ích (Send Utility Template)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
