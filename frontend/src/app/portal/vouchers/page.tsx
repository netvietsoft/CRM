import { getSession } from '@/lib/auth';
export const dynamic = 'force-dynamic';
import { apiClient } from '@/lib/apiClient';

function fmt(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

function formatVnDate(date: string | Date | null) {
  if (!date) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(new Date(date));
}

function daysUntil(date: string | Date) {
  const now = new Date();
  const target = new Date(date);
  const diff = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default async function PortalVouchersPage() {
  const session = await getSession();
  if (!session) return null;

  let userVouchers: any[] = [];
  let systemVouchers: any[] = [];

  const now = new Date();

  try {
    const [userVouchersData, systemVouchersData] = await Promise.all([
      apiClient.get<any[]>('/vouchers/user/my-vouchers'),
      apiClient.get<any[]>('/vouchers'),
    ]);
    userVouchers = userVouchersData;
    systemVouchers = systemVouchersData;
  } catch (error) {
    console.error('Error fetching vouchers:', error);
  }

  // Separate PENDING vouchers from available ones
  const pendingVouchers = userVouchers.filter(v => {
    if (v.isUsed) return false;
    if (v.status === 'PENDING') return true;
    return false;
  });

  const available = userVouchers.filter(v => {
    if (v.isUsed) return false;
    if (v.status === 'PENDING') return false; // Exclude PENDING from available
    if (v.status === 'REJECTED') return false;
    if (!v.expiresAt) return true;
    return new Date(v.expiresAt) > now;
  });

  const expiringSoon = available.filter(v => {
    if (!v.expiresAt) return false;
    const msDiff = new Date(v.expiresAt).getTime() - now.getTime();
    const daysDiff = msDiff / (1000 * 60 * 60 * 24);
    return daysDiff >= 0 && daysDiff <= 7;
  });

  const regularAvailable = available.filter(v => !expiringSoon.includes(v));

  const campaignIcons: Record<string, string> = {
    WELCOME: '🎉', VIP: '👑', BUNDLE: '📦', FREESHIP: '🚚',
    GAMIFICATION: '🎰', REFERRAL: '🔗', BIRTHDAY: '🎂',
  };

  const renderVoucherCard = (uv: any) => (
    <div key={uv.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all hover:shadow-md">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xl">{campaignIcons[uv.voucher.campaignCategory] || '🎫'}</span>
          <span className="font-bold text-gray-800">{uv.voucher.name}</span>
          {uv.voucher.store && (
            <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200 whitespace-nowrap">
              Shop: {uv.voucher.store.name}
            </span>
          )}
        </div>
        <div className="font-mono text-sm font-bold text-blue-600 tracking-wide mb-3 bg-blue-50 px-3 py-1.5 rounded inline-block">
          {uv.voucher.code}
        </div>
        <div className="text-sm text-gray-600 mb-2">
          Đơn tối thiểu: <span className="font-semibold">{fmt(uv.voucher.minOrderValue)}</span>
        </div>
        <div className="text-sm text-gray-600 mb-3">
          Giảm: <span className="font-semibold text-green-600">
            {uv.voucher.type === 'STACK' ? (() => {
              const tiers = uv.voucher.stackTiers;
              if (tiers && tiers.length > 0) {
                const maxTier = tiers.reduce((max: any, t: any) => t.discount > max.discount ? t : max, tiers[0]);
                const condition = tiers[0].conditionType === 'amount' ? 'Theo giá trị' : 'Theo số SP';
                return `📊 ${condition} (Đến ${maxTier.type === 'PERCENT' ? `${maxTier.discount}%` : fmt(maxTier.discount)})`;
              }
              return '📊 Stack';
            })() : uv.voucher.type === 'PERCENT' ? `${uv.voucher.value}%` :
              uv.voucher.type === 'FREESHIP' ? 'Phí ship' : fmt(uv.voucher.value)}
          </span>
        </div>
        {uv.expiresAt && (
          <div className="text-xs text-orange-600 mb-3">
            ⏰ Hết hạn: {formatVnDate(uv.expiresAt)}
          </div>
        )}
        <div className="flex justify-end">
          <a
            href="/portal/products"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm"
          >
            Sử dụng ngay
          </a>
        </div>
      </div>
    </div>
  );

  const renderPendingVoucherCard = (uv: any) => {
    const days = uv.unlockAt ? daysUntil(uv.unlockAt) : 0;

    return (
      <div key={uv.id} className="bg-white border-2 border-amber-200 rounded-xl overflow-hidden transition-all hover:shadow-md relative">
        {/* Pending overlay badge */}
        <div className="absolute top-3 right-3">
          <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-[11px] font-bold">
            ⏳ Đang chờ
          </span>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xl">{campaignIcons[uv.voucher.campaignCategory] || '🎫'}</span>
            <span className="font-bold text-gray-800">{uv.voucher.name}</span>
          </div>
          <div className="font-mono text-sm font-bold text-gray-400 tracking-wide mb-3 bg-gray-100 px-3 py-1.5 rounded inline-block">
            {uv.voucher.code}
          </div>
          <div className="text-sm text-gray-600 mb-2">
            Giảm: <span className="font-semibold text-green-600">
              {uv.voucher.type === 'PERCENT' ? `${uv.voucher.value}%` :
                uv.voucher.type === 'FREESHIP' ? 'Phí ship' : fmt(uv.voucher.value)}
            </span>
          </div>

          {/* Unlock date info */}
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-amber-500">🔒</span>
              {days > 0 ? (
                <span className="text-amber-700 font-medium">
                  Khả dụng sau <strong>{days} ngày</strong>
                  <span className="text-gray-500 font-normal"> ({formatVnDate(uv.unlockAt)})</span>
                </span>
              ) : (
                <span className="text-green-700 font-medium">
                  Đang chờ hệ thống kích hoạt...
                </span>
              )}
            </div>
          </div>

          {uv.sourceOrderCode && (
            <div className="mt-2 text-xs text-gray-500">
              Từ đơn hàng: <span className="font-mono font-semibold">#{uv.sourceOrderCode}</span>
            </div>
          )}

          <div className="flex justify-end mt-3">
            <span className="px-4 py-2 bg-gray-200 text-gray-500 rounded-lg font-medium text-sm cursor-not-allowed">
              Chưa khả dụng
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderSystemVoucherCard = (v: any) => {
    const isClaimed = userVouchers.some(uv => uv.voucher?.id === v.id || uv.voucherId === v.id);

    return (
      <div key={v.id} className="bg-white border-2 border-dashed border-gray-300 rounded-xl overflow-hidden transition-all hover:shadow-md opacity-90">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{campaignIcons[v.campaignCategory] || '🎫'}</span>
            <span className="font-bold text-gray-800">{v.name}</span>
          </div>
          <div className="font-mono text-sm font-bold text-blue-600 tracking-wide mb-3 bg-blue-50 px-3 py-1.5 rounded inline-block">
            {v.code}
          </div>
          <div className="text-sm text-gray-600 mb-2">
            Đơn tối thiểu: <span className="font-semibold">{fmt(v.minOrderValue)}</span>
          </div>
          <div className="text-sm text-gray-600 mb-3">
            Giảm: <span className="font-semibold text-green-600">
              {v.type === 'STACK' ? (() => {
                const tiers = v.stackTiers;
                if (tiers && tiers.length > 0) {
                  const maxTier = tiers.reduce((max: any, t: any) => t.discount > max.discount ? t : max, tiers[0]);
                  const condition = tiers[0].conditionType === 'amount' ? 'Theo giá trị' : 'Theo số SP';
                  return `📊 ${condition} (Đến ${maxTier.type === 'PERCENT' ? `${maxTier.discount}%` : fmt(maxTier.discount)})`;
                }
                return '📊 Stack';
              })() : v.type === 'PERCENT' ? `${v.value}%` :
                v.type === 'FREESHIP' ? 'Phí ship' : fmt(v.value)}
            </span>
          </div>
          {v.validTo && (
            <div className="text-xs text-gray-500 mb-3">
              ⏰ Hạn dùng: {formatVnDate(v.validTo)}
            </div>
          )}
          <div className="flex justify-end">
            {isClaimed ? (
              <span className="px-4 py-2 bg-green-50 text-green-700 rounded-lg font-medium text-sm border border-green-200">
                Đã nhận
              </span>
            ) : (
              <a
                href="/portal/products"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm"
              >
                Sử dụng ngay
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  const groupedVouchersMap = systemVouchers.reduce((acc: any, v: any) => {
    const storeName = v.store?.name || 'Voucher toàn sàn';
    const storeSlug = v.store?.slug || 'platform';
    const key = `${storeName}|${storeSlug}`;
    if (!acc[key]) acc[key] = { name: storeName, slug: storeSlug, vouchers: [] };
    acc[key].vouchers.push(v);
    return acc;
  }, {});
  const groupedVouchers = Object.values(groupedVouchersMap) as any[];

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-1">Voucher của tôi</h1>
        <p className="text-gray-600 text-sm">{available.length} voucher khả dụng{pendingVouchers.length > 0 && ` · ${pendingVouchers.length} đang chờ kích hoạt`}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">🎫 Khả dụng</div>
          <div className="text-3xl font-bold text-green-600">{regularAvailable.length}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">⏳ Đang chờ kích hoạt</div>
          <div className="text-3xl font-bold text-amber-600">{pendingVouchers.length}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-sm text-gray-600 mb-2">⏰ Sắp hết hạn</div>
          <div className="text-3xl font-bold text-orange-600">{expiringSoon.length}</div>
        </div>
      </div>

      {/* Pending Vouchers Section */}
      {pendingVouchers.length > 0 && (
        <>
          <h3 className="text-lg font-bold mb-4 text-amber-600 flex items-center gap-2">
            ⏳ Đang chờ kích hoạt
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
            {pendingVouchers.map(renderPendingVoucherCard)}
          </div>
        </>
      )}

      {available.length === 0 && pendingVouchers.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm text-center">
          <div className="text-6xl mb-3">🎫</div>
          <div className="font-semibold mb-2">Chưa có voucher nào</div>
          <div className="text-sm text-gray-600">Mua sắm hoặc quay vòng quay để nhận voucher!</div>
        </div>
      ) : (
        <>
          {expiringSoon.length > 0 && (
            <>
              <h3 className="text-lg font-bold mb-4 text-orange-600">
                Sắp hết hạn
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                {expiringSoon.map(renderVoucherCard)}
              </div>
            </>
          )}

          {regularAvailable.length > 0 && (
            <>
              <h3 className="text-lg font-bold mb-4">
                Khả dụng
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                {regularAvailable.map(renderVoucherCard)}
              </div>
            </>
          )}
        </>
      )}

      <hr className="my-8 border-gray-200" />
      
      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-gray-800 mb-1">Mã giảm giá từ hệ thống</h2>
        <p className="text-gray-600 text-sm">Khám phá và lưu ngay các ưu đãi đặc biệt</p>
      </div>

      {systemVouchers.length === 0 ? (
        <div className="text-sm text-gray-500">Hiện tại hệ thống chưa có voucher nào mới.</div>
      ) : (
        <div className="space-y-8 mb-8">
          {groupedVouchers.map(({ name: storeName, slug: storeSlug, vouchers }) => (
            <div key={storeName}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">{storeName === 'Voucher toàn sàn' ? '🏢' : '🏪'}</span>
                {storeName === 'Voucher toàn sàn' ? (
                  <h3 className="text-lg font-bold text-gray-800">{storeName}</h3>
                ) : (
                  <a href={`/portal/stores/${storeSlug}`} className="text-lg font-bold text-gray-800 hover:text-indigo-600 transition-colors flex items-center gap-2">
                    {storeName} <span className="text-sm font-normal text-indigo-600">Xem Shop →</span>
                  </a>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {vouchers.map(renderSystemVoucherCard)}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
