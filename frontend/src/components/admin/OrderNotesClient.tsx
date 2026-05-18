'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { useOrderSave } from './OrderSaveProvider';
import { apiClientClient } from '@/lib/apiClientClient';

export default function OrderNotesClient({ order }: { order: any }) {
  const [activeTab, setActiveTab] = useState<'internal' | 'print' | 'exchange'>('internal');
  const [note, setNote] = useState(order.note || '');
  const [customerNote, setCustomerNote] = useState(order.customerNote || '');
  const { setHasChanges, registerSaveAction } = useOrderSave();

  const initialNote = useRef(order.note || '');
  const initialCustomerNote = useRef(order.customerNote || '');

  // Register save action
  useEffect(() => {
    registerSaveAction('notes', async () => {
      await apiClientClient.patch(`/orders/${order.id}/note`, {
        note,
        customerNote,
      });
      // Update refs after save
      initialNote.current = note;
      initialCustomerNote.current = customerNote;
    });
  }, [note, customerNote, order.id, registerSaveAction]);

  // Track changes
  useEffect(() => {
    const hasNoteChanged = note !== initialNote.current;
    const hasCustomerNoteChanged = customerNote !== initialCustomerNote.current;
    if (hasNoteChanged || hasCustomerNoteChanged) {
      setHasChanges(true);
    }
  }, [note, customerNote, setHasChanges]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 h-full flex flex-col">
      <h2 className="text-xl font-bold text-gray-800 mb-5">Ghi chú</h2>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
        <button
          onClick={() => setActiveTab('internal')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'internal'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Nội bộ
        </button>
        <button
          onClick={() => setActiveTab('print')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'print'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Để in
        </button>
        <button
          onClick={() => setActiveTab('exchange')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'exchange'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Trao đổi
        </button>
      </div>

      {/* Text Area */}
      <div className="flex-1 bg-gray-50 rounded-lg border border-gray-100 p-3 mb-4 min-h-[120px]">
        <textarea
          className="w-full h-full bg-transparent border-none outline-none resize-none text-sm text-gray-800 placeholder-gray-400"
          placeholder="Viết ghi chú hoặc /shortcut để ghi chú nhanh"
          value={activeTab === 'internal' ? note : activeTab === 'exchange' ? customerNote : ''}
          onChange={(e) => {
            if (activeTab === 'internal') setNote(e.target.value);
            if (activeTab === 'exchange') setCustomerNote(e.target.value);
          }}
          readOnly={activeTab === 'print'}
        />
      </div>

      {/* Upload Button */}
      <div>
        <button className="flex flex-col items-center justify-center w-16 h-16 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 hover:border-blue-400 hover:text-blue-500 transition-colors">
          <Plus className="w-5 h-5 mb-1" />
          <span className="text-[11px]">Tải lên</span>
        </button>
      </div>
    </div>
  );
}
