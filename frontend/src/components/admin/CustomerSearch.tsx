'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import Select from '@/components/ui/Select';

const RANKS = [
  { value: '', label: 'Tất cả hạng' },
  { value: 'MEMBER', label: 'Thành viên' },
  { value: 'SILVER', label: 'Bạc' },
  { value: 'GOLD', label: 'Vàng' },
  { value: 'PLATINUM', label: 'Bạch Kim' },
  { value: 'DIAMOND', label: 'Kim Cương' },
];

export default function CustomerSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [rank, setRank] = useState(searchParams.get('rank') || '');
  
  const debouncedSearch = useDebounce(search, 500);
  const initialRender = useRef(true);
  
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    
    const params = new URLSearchParams(window.location.search);
    
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    } else {
      params.delete('search');
    }
    
    if (rank) {
      params.set('rank', rank);
    } else {
      params.delete('rank');
    }
    
    params.delete('page'); // Reset page when searching
    
    router.push(`/admin/customers?${params.toString()}`);
  }, [debouncedSearch, rank, router]);

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm theo tên, số điện thoại..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-700 placeholder-gray-400 transition-shadow"
          />
        </div>
        <div className="relative w-full sm:w-auto">
          <Select
            value={rank}
            onChange={(val) => setRank(val)}
            options={RANKS}
            className="w-full sm:w-48"
            placeholder="Tất cả hạng"
          />
        </div>
      </div>
    </div>
  );
}
