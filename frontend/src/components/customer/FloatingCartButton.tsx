'use client';

import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';

interface FloatingCartButtonProps {
  itemCount: number;
}

export default function FloatingCartButton({ itemCount }: FloatingCartButtonProps) {
  return (
    <Link
      href="/portal/cart"
      className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center z-50 group"
    >
      <ShoppingCart className="w-6 h-6" />
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-[11px] font-bold shadow-md">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  );
}
