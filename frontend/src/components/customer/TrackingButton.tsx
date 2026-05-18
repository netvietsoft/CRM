'use client';

import { useState } from 'react';
import { Package } from 'lucide-react';
import TrackingModal from './TrackingModal';

export default function TrackingButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="group relative px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden border border-indigo-500/30"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
        <Package className="w-5 h-5 relative z-10 group-hover:scale-110 transition-transform duration-300" />
        <span className="relative z-10 tracking-wide">Tra cứu vận chuyển</span>
      </button>

      <TrackingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
