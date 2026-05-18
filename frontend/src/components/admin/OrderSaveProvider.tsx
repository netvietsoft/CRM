'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface OrderSaveContextType {
  hasChanges: boolean;
  setHasChanges: (val: boolean) => void;
  registerSaveAction: (key: string, action: () => Promise<void>) => void;
}

const OrderSaveContext = createContext<OrderSaveContextType | undefined>(undefined);

export function useOrderSave() {
  const context = useContext(OrderSaveContext);
  if (!context) throw new Error('useOrderSave must be used within OrderSaveProvider');
  return context;
}

export function OrderSaveProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [hasChanges, setHasChanges] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const saveActions = useRef<Map<string, () => Promise<void>>>(new Map());

  const registerSaveAction = (key: string, action: () => Promise<void>) => {
    saveActions.current.set(key, action);
  };

  useEffect(() => {
    // The actual scrolling container is the <main> element in AdminShell,
    // not window (which has overflow hidden at the top level).
    const scrollContainer = document.querySelector('main.overflow-y-auto') || document.querySelector('main');
    if (!scrollContainer) return;

    let lastY = scrollContainer.scrollTop;

    const handleScroll = () => {
      const currentY = scrollContainer.scrollTop;
      
      // If we scroll down more than 10px, hide the bar
      if (currentY > lastY && currentY > 50) {
        setIsVisible(false);
      } 
      // If we scroll up, show the bar
      else if (currentY < lastY) {
        setIsVisible(true);
      }
      
      lastY = currentY;
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Execute all registered save actions SEQUENTIALLY to avoid race conditions on the same record
      for (const action of Array.from(saveActions.current.values())) {
        await action();
      }
      
      // Refresh the page data
      window.location.reload();

      // Wait a bit for UX
      await new Promise(res => setTimeout(res, 500));
      
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Có lỗi xảy ra khi lưu thay đổi!');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OrderSaveContext.Provider value={{ hasChanges, setHasChanges, registerSaveAction }}>
      {children}
      
      {/* Floating Action Bar */}
      <div 
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-in-out ${
          hasChanges 
            ? isVisible 
              ? 'translate-y-0 opacity-100' 
              : 'translate-y-[150%] opacity-0 pointer-events-none' // Hide when scrolling down
            : 'translate-y-[150%] opacity-0 pointer-events-none' // Hide when no changes
        }`}
      >
        <div className="bg-white text-gray-800 px-6 py-3.5 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.15)] flex items-center gap-6 border border-gray-200">
          <span className="text-sm font-medium whitespace-nowrap">Bạn có thay đổi chưa lưu</span>
          <div className="flex items-center gap-3 border-l border-gray-200 pl-6">
            <button 
              onClick={() => setHasChanges(false)}
              className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-full transition-colors"
              disabled={isSaving}
            >
              Hủy
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-lg shadow-blue-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </div>
    </OrderSaveContext.Provider>
  );
}
