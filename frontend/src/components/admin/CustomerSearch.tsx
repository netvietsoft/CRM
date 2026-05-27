'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import Select from '@/components/ui/Select';

interface ProvinceOption {
  code: string;
  name: string;
}

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
  const [province, setProvince] = useState(searchParams.get('province') || '');
  const [provinces, setProvinces] = useState<ProvinceOption[]>([]);
  
  const debouncedSearch = useDebounce(search, 500);
  const initialRender = useRef(true);

  useEffect(() => {
    const loadProvinces = async () => {
      try {
        const res = await fetch('/internal-api/address?type=provinces');
        if (!res.ok) throw new Error('Failed to load provinces');
        const data = await res.json();
        setProvinces(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load province options:', error);
      }
    };

    loadProvinces();
  }, []);
  
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

    if (province) {
      params.set('province', province);
    } else {
      params.delete('province');
    }
    
    params.delete('page'); // Reset page when searching
    
    router.push(`/admin/customers?${params.toString()}`);
  }, [debouncedSearch, rank, province, router]);

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
      <div className="flex flex-col xl:flex-row xl:items-center gap-4">
        <div className="relative w-full xl:min-w-0 xl:flex-[1.6]">
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
        <div className="relative w-full xl:w-56 xl:flex-none">
          <Select
            value={province}
            onChange={(val) => setProvince(val)}
            options={[
              { value: '', label: 'Tất cả khu vực' },
              ...provinces.map((item) => ({ value: item.name, label: item.name })),
            ]}
            className="w-full xl:w-56"
            placeholder="Tất cả khu vực"
          />
        </div>
        <div className="relative w-full xl:w-48 xl:flex-none">
          <Select
            value={rank}
            onChange={(val) => setRank(val)}
            options={RANKS}
            className="w-full xl:w-48"
            placeholder="Tất cả hạng"
          />
        </div>
      </div>
    </div>
  );
}
