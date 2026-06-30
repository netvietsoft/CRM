'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';

interface AdAccountLite {
  id: string;
  externalId: string;
  name: string | null;
}

const ALLOWED = ['ADMIN', 'MODERATOR'];

/**
 * Menu cây cho Quảng cáo: Quảng cáo → Meta Ads → BM → danh sách tài khoản (động từ /ads/accounts).
 * Click tài khoản → /admin/ads?accountId=<id> (lọc trang Quảng cáo theo tài khoản).
 */
export default function AdsSidebarMenu({ role }: { role: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeAccountId = searchParams.get('accountId') || '';
  const onAdsPage = pathname.startsWith('/admin/ads');

  const [openRoot, setOpenRoot] = useState(onAdsPage);
  const [openMeta, setOpenMeta] = useState(onAdsPage);
  const [openBm, setOpenBm] = useState(onAdsPage);
  const [accounts, setAccounts] = useState<AdAccountLite[] | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAccounts = useCallback(async () => {
    if (accounts !== null || loading) return;
    setLoading(true);
    try {
      const list = await apiClientClient.get<AdAccountLite[]>('/ads/accounts');
      setAccounts(Array.isArray(list) ? list : []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [accounts, loading]);

  // Nạp danh sách tài khoản khi mở nhánh BM (lazy).
  useEffect(() => {
    if (openBm) void loadAccounts();
  }, [openBm, loadAccounts]);

  if (!ALLOWED.includes(role)) return null;

  const rowBase = 'flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors';
  const chev = (open: boolean) => <span className={`text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>;

  return (
    <div className="mb-3">
      {/* Nhóm: Quảng cáo */}
      <button
        type="button"
        onClick={() => setOpenRoot((v) => !v)}
        className="flex items-center justify-between w-full px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600"
      >
        <span>Quảng cáo</span>
        {chev(openRoot)}
      </button>

      {openRoot && (
        <div>
          {/* Meta Ads */}
          <button
            type="button"
            onClick={() => setOpenMeta((v) => !v)}
            className={`${rowBase} ${onAdsPage ? 'text-blue-600' : 'hover:bg-gray-100'}`}
          >
            <span>Meta Ads</span>
            {chev(openMeta)}
          </button>

          {openMeta && (
            <div className="ml-3 mt-1 mb-1 pl-2 border-l border-gray-200 space-y-1">
              {/* Tất cả tài khoản */}
              <Link
                href="/admin/ads"
                className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  onAdsPage && !activeAccountId ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'hover:bg-gray-100'
                }`}
              >
                Tất cả tài khoản
              </Link>

              {/* BM → list tài khoản */}
              <button
                type="button"
                onClick={() => setOpenBm((v) => !v)}
                className={`${rowBase} text-gray-700 hover:bg-gray-100`}
              >
                <span>BM</span>
                {chev(openBm)}
              </button>

              {openBm && (
                <div className="ml-3 mt-1 mb-1 pl-2 border-l border-gray-200 space-y-1">
                  {loading && <div className="px-3 py-1.5 text-xs text-gray-400">Đang tải…</div>}
                  {!loading && accounts && accounts.length === 0 && (
                    <div className="px-3 py-1.5 text-xs text-gray-400">Chưa có tài khoản. Đồng bộ trước.</div>
                  )}
                  {accounts?.map((a) => {
                    const active = onAdsPage && activeAccountId === a.id;
                    return (
                      <Link
                        key={a.id}
                        href={`/admin/ads?accountId=${a.id}`}
                        title={a.name || a.externalId}
                        className={`block px-3 py-1.5 rounded-lg text-sm truncate transition-colors ${
                          active ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'hover:bg-gray-100'
                        }`}
                      >
                        {a.name || a.externalId}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
