'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { apiClientClient } from '@/lib/apiClientClient';
import { Megaphone, ChevronRight } from 'lucide-react';

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
  const onAdsPage = pathname.startsWith('/admin/adsmeta') || pathname === '/admin/ads';
  const onAllAccounts = pathname === '/admin/adsmeta/accall';
  // /admin/adsmeta/<id> → id ở vị trí thứ 3; accall không tính là account.
  const activeAccountId = pathname.startsWith('/admin/adsmeta/') && !onAllAccounts ? pathname.split('/')[3] || '' : '';

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

  const rowBase = 'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[9px] text-[13px] font-medium transition-colors';
  const chev = (open: boolean) => <ChevronRight size={14} className={`text-[#9ca3af] transition-transform ${open ? 'rotate-90' : ''}`} />;
  const subLink = (active: boolean) =>
    `block px-2.5 py-1.5 rounded-[8px] text-[13px] truncate transition-colors ${
      active ? 'bg-[#2563eb] text-white font-semibold' : 'text-[#4b5563] hover:bg-[#f3f4f6]'
    }`;

  return (
    <div className="mb-3.5">
      {/* Nhóm: Quảng cáo */}
      <button
        type="button"
        onClick={() => setOpenRoot((v) => !v)}
        className="flex items-center justify-between w-full px-2.5 mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#8a91a3] hover:text-[#6b7280]"
      >
        <span>Quảng cáo</span>
        <ChevronRight size={12} className={`transition-transform ${openRoot ? 'rotate-90' : ''} ${onAdsPage ? 'text-[#2563eb]' : 'text-[#c4c9d4]'}`} />
      </button>

      {openRoot && (
        <div className="space-y-0.5">
          {/* Meta Ads */}
          <button
            type="button"
            onClick={() => setOpenMeta((v) => !v)}
            className={`${rowBase} ${onAdsPage ? 'text-[#2563eb]' : 'text-[#374151] hover:bg-[#f3f4f6]'}`}
          >
            <Megaphone size={17} strokeWidth={1.8} className="flex-shrink-0" />
            <span className="flex-1 text-left">Meta Ads</span>
            {chev(openMeta)}
          </button>

          {openMeta && (
            <div className="ml-[26px] mt-0.5 mb-1 pl-2.5 border-l border-[#eceef2] space-y-0.5">
              {/* Tất cả tài khoản */}
              <Link href="/admin/adsmeta/accall" className={subLink(onAllAccounts)}>
                Tất cả tài khoản
              </Link>

              {/* Fanpage */}
              <Link href="/admin/adsmeta/pages" className={subLink(pathname === '/admin/adsmeta/pages')}>
                Fanpage
              </Link>

              {/* BM → list tài khoản */}
              <button
                type="button"
                onClick={() => setOpenBm((v) => !v)}
                className={`${rowBase} text-[#374151] hover:bg-[#f3f4f6]`}
              >
                <span className="flex-1 text-left">BM</span>
                {chev(openBm)}
              </button>

              {openBm && (
                <div className="ml-3 mt-0.5 mb-1 pl-2.5 border-l border-[#eceef2] space-y-0.5">
                  {loading && <div className="px-2.5 py-1.5 text-xs text-[#9ca3af]">Đang tải…</div>}
                  {!loading && accounts && accounts.length === 0 && (
                    <div className="px-2.5 py-1.5 text-xs text-[#9ca3af]">Chưa có tài khoản. Đồng bộ trước.</div>
                  )}
                  {accounts?.map((a) => (
                    <Link
                      key={a.id}
                      href={`/admin/adsmeta/${a.id}`}
                      title={a.name || a.externalId}
                      className={subLink(activeAccountId === a.id)}
                    >
                      {a.name || a.externalId}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
