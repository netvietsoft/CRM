'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md';
}

export default function Select({ 
  value, 
  onChange, 
  options, 
  className = 'w-full', 
  placeholder = 'Chọn', 
  disabled = false,
  size = 'sm'
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const updateMenuRect = () => {
      setMenuRect(dropdownRef.current?.getBoundingClientRect() || null);
    };

    updateMenuRect();
    window.addEventListener('resize', updateMenuRect);
    window.addEventListener('scroll', updateMenuRect, true);
    return () => {
      window.removeEventListener('resize', updateMenuRect);
      window.removeEventListener('scroll', updateMenuRect, true);
    };
  }, [isOpen]);

  const selectedLabel = options.find(o => String(o.value) === String(value))?.label || placeholder;
  const menuPosition = menuRect ? (() => {
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - menuRect.bottom - 8;
    const spaceAbove = menuRect.top - 8;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(240, openUp ? spaceAbove : spaceBelow));

    return {
      top: openUp ? Math.max(8, menuRect.top - maxHeight - 4) : menuRect.bottom + 4,
      left: menuRect.left,
      width: menuRect.width,
      maxHeight,
    };
  })() : null;

  const sizeClasses = {
    xs: 'pl-2 pr-6 py-1 text-xs',
    sm: 'pl-3 pr-10 py-2 text-sm',
    md: 'pl-4 pr-10 py-2.5 text-base'
  };

  const optionSizeClasses = {
    xs: 'px-2 py-1.5 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-base'
  };

  const hasBg = className.includes('bg-');
  const hasBorder = className.includes('border-');
  const hasTextColor = className.includes('text-');
  const hasRounded = className.includes('rounded-');

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full ${sizeClasses[size]} transition-shadow flex items-center justify-between
          ${!hasRounded ? 'rounded-lg' : ''}
          ${!hasBorder ? 'border border-gray-200' : ''}
          ${!hasBg ? 'bg-white hover:bg-gray-50' : ''}
          ${!hasTextColor ? 'text-gray-700' : ''}
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className="truncate">{selectedLabel}</span>
      </button>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>

      {isOpen && !disabled && menuPosition && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[1000] bg-white border border-gray-200 rounded-lg shadow-xl py-1 p-1 overflow-y-auto overscroll-contain"
          style={menuPosition}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(String(option.value));
                setIsOpen(false);
              }}
              className={`w-full text-left rounded-md transition-colors ${optionSizeClasses[size]} ${
                String(value) === String(option.value)
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
