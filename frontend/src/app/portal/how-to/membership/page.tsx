import Link from 'next/link';
import { Metadata } from 'next';
import { apiClient } from '@/lib/apiClient';
import { MembershipConfig, MembershipRank, normalizeMembershipConfigs } from '@/lib/membership';
import { formatVndSymbol } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Phân hạng VIP | Customer CRM',
  description: 'Bảng tra cứu mốc chi tiêu tích lũy và cách hệ thống đang phân hạng thành viên trên Customer CRM.',
};

const lastUpdated = '25/05/2026';

const highlightCards = [
  {
    eyebrow: 'Theo dõi trực tiếp',
    title: 'Hạng thành viên đang hiện ở nhiều chỗ',
    description: 'Người dùng nhìn thấy hạng ngay trên thanh điều hướng, dashboard và trang hồ sơ cá nhân.',
  },
  {
    eyebrow: 'Chu kỳ đang dùng',
    title: 'Portal dùng mốc backend',
    description: 'Trang hướng dẫn này lấy trực tiếp cấu hình rank từ backend, không còn dùng mốc cứng ở frontend.',
  },
  {
    eyebrow: 'Điều cần lưu ý',
    title: 'Chưa có bảng quyền lợi cố định theo từng hạng',
    description: 'Ưu đãi nếu có vẫn xuất hiện trong luồng voucher hoặc campaign riêng, chưa có trang quyền lợi VIP tách biệt.',
  },
];

const availableNow = [
  'Tên hạng thành viên đang hiển thị trực tiếp ở giao diện portal.',
  'Thanh tiến độ nâng hạng hiện cho xem tổng chi tiêu tích lũy và số tiền còn thiếu để lên mốc tiếp theo.',
  'Ba màn hình chính là navbar, dashboard và hồ sơ cá nhân hiện dùng cùng một cấu hình rank từ backend.',
];

const notShownYet = [
  'Chưa có bảng đặc quyền cố định theo từng hạng ở phía người dùng.',
  'Chưa có màn hình riêng để tra cứu lịch sử thay đổi hạng theo từng kỳ.',
  'Các ưu đãi VIP nếu có vẫn nằm trong voucher hoặc chiến dịch riêng, không hiển thị tập trung theo rank.',
];

const quickLinks = [
  {
    href: '/portal',
    title: 'Dashboard',
    description: 'Xem thanh tiến độ hạng thành viên và mức chi tiêu tích lũy đang được backend dùng để xếp hạng.',
    accent: 'from-sky-500/15 to-cyan-500/5',
  },
  {
    href: '/portal/profile',
    title: 'Hồ sơ cá nhân',
    description: 'Kiểm tra hạng đang hiển thị cùng thông tin tài khoản của người dùng.',
    accent: 'from-amber-500/15 to-orange-500/5',
  },
  {
    href: '/portal/vouchers',
    title: 'Voucher và campaign',
    description: 'Đi tới nơi đang hiển thị các ưu đãi thực tế thay vì mô tả quyền lợi VIP chung chung.',
    accent: 'from-emerald-500/15 to-lime-500/5',
  },
];

const rankVisuals: Record<
  MembershipRank,
  {
    icon: string;
    label: string;
    cardClass: string;
    badgeClass: string;
    amountClass: string;
    railClass: string;
  }
> = {
  MEMBER: {
    icon: '01',
    label: 'Khởi đầu',
    cardClass: 'border-slate-200 bg-gradient-to-br from-slate-100 via-white to-slate-50',
    badgeClass: 'border-slate-200 bg-white text-slate-700',
    amountClass: 'text-slate-900',
    railClass: 'from-slate-500 to-slate-300',
  },
  SILVER: {
    icon: '02',
    label: 'Ổn định',
    cardClass: 'border-zinc-200 bg-gradient-to-br from-zinc-100 via-white to-slate-50',
    badgeClass: 'border-zinc-300 bg-zinc-50 text-zinc-700',
    amountClass: 'text-zinc-900',
    railClass: 'from-zinc-500 to-zinc-300',
  },
  GOLD: {
    icon: '03',
    label: 'Bứt lên',
    cardClass: 'border-amber-200 bg-gradient-to-br from-amber-100 via-white to-orange-50',
    badgeClass: 'border-amber-300 bg-amber-50 text-amber-700',
    amountClass: 'text-amber-900',
    railClass: 'from-amber-500 to-orange-300',
  },
  DIAMOND: {
    icon: '04',
    label: 'Tăng tốc',
    cardClass: 'border-sky-200 bg-gradient-to-br from-sky-100 via-white to-cyan-50',
    badgeClass: 'border-sky-300 bg-sky-50 text-sky-700',
    amountClass: 'text-sky-900',
    railClass: 'from-sky-500 to-cyan-300',
  },
  PLATINUM: {
    icon: '05',
    label: 'Cao nhất',
    cardClass: 'border-fuchsia-200 bg-gradient-to-br from-fuchsia-100 via-white to-rose-50',
    badgeClass: 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700',
    amountClass: 'text-fuchsia-900',
    railClass: 'from-fuchsia-500 to-rose-300',
  },
};

function fmt(n: number) {
  return formatVndSymbol(n);
}

async function getRankConfigs() {
  try {
    const response = await apiClient.get<{ configs: MembershipConfig[] }>('/rank-config', { cache: 'no-store' });
    return normalizeMembershipConfigs(response.configs);
  } catch (error) {
    console.error('Error fetching rank configs:', error);
    return [];
  }
}

export default async function MembershipGuidePage() {
  const rankConfigs = await getRankConfigs();
  const milestones: Array<{
    rank: MembershipRank;
    threshold: number;
    title: string;
    description: string;
    next: MembershipRank | 'MAX';
  }> = rankConfigs.map((item, index) => ({
    rank: item.rank,
    threshold: item.minTotalSpent,
    title: index === 0 ? 'Mốc mặc định khi bắt đầu' : `Mốc hiển thị ${item.rank}`,
    description: item.description || `Khi tổng chi tiêu tích lũy chạm mốc này, hệ thống sẽ cập nhật hạng ${item.rank}.`,
    next: rankConfigs[index + 1]?.rank || 'MAX',
  }));

  return (
    <div className="min-h-screen bg-slate-50 py-6 md:py-12">
      <div className="mx-auto w-full">
        <section className="overflow-hidden rounded-2xl bg-slate-950 text-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.75)]">
          <div className="grid gap-6 px-5 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10 2xl:grid-cols-[1.2fr_0.8fr] 2xl:gap-8 2xl:px-10 2xl:py-12">
            <div className="min-w-0">
              <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200 sm:text-xs sm:tracking-[0.2em]">
                Membership Guide
              </div>
              <h1 className="max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl">
                Phân hạng VIP
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base md:text-lg">
                Trang này mô tả đúng những gì hệ thống đang áp dụng: mốc chi tiêu tích lũy từ backend, vị trí hạng đang xuất hiện và những gì chưa được thể hiện thành một bảng quyền lợi cố định.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-xs font-semibold text-sky-100 sm:px-4 sm:text-sm">
                  5 hạng đang dùng
                </span>
                <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-100 sm:px-4 sm:text-sm">
                  Theo dõi theo mốc backend
                </span>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-100 sm:px-4 sm:text-sm">
                  Hiển thị trên portal thực tế
                </span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:text-xs sm:tracking-[0.2em]">Cập nhật</div>
                <div className="mt-3 break-words text-2xl font-black text-white sm:text-3xl">{lastUpdated}</div>
                <div className="mt-2 text-sm leading-6 text-slate-300">
                  Nội dung đã chỉnh theo đúng cấu hình rank đang lấy từ backend.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.2em]">Portal đang làm gì</div>
                <div className="mt-3 grid gap-3">
                  <div className="rounded-xl bg-slate-100 px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Navbar</div>
                    <div className="mt-1 text-sm font-semibold">Hiển thị rank hiện tại</div>
                  </div>
                  <div className="rounded-xl bg-slate-100 px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dashboard</div>
                    <div className="mt-1 text-sm font-semibold">Hiển thị tiến độ lên hạng</div>
                  </div>
                  <div className="rounded-xl bg-slate-100 px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profile</div>
                    <div className="mt-1 text-sm font-semibold">Hiển thị hạng đồng bộ</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-3">
          {highlightCards.map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.2em]">{item.eyebrow}</div>
              <div className="mt-3 text-xl font-bold tracking-tight text-slate-900">{item.title}</div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 md:p-8">
          <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-end 2xl:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.2em]">Bảng tra cứu</div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Mốc chi tiêu đang hiển thị trên portal</h2>
            </div>
            <div className="max-w-2xl text-sm leading-6 text-slate-500 2xl:max-w-md">
              Cách đọc rất đơn giản: khi tổng chi tiêu tích lũy chạm mốc cấu hình, backend sẽ cập nhật hạng tương ứng và portal hiển thị lại theo hạng đó.
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3 min-[1900px]:grid-cols-5">
            {milestones.map((item) => {
              const visual = rankVisuals[item.rank];

              return (
                <div key={item.rank} className={`rounded-2xl border p-5 shadow-sm ${visual.cardClass}`}>
                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-black text-white ${visual.railClass}`}>
                      {visual.icon}
                    </div>
                    <div className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] sm:text-xs sm:tracking-[0.2em] ${visual.badgeClass}`}>
                      {item.rank}
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.2em]">{visual.label}</div>
                    <h3 className="mt-2 text-lg font-black leading-tight tracking-tight text-slate-900 sm:text-xl">{item.title}</h3>
                  </div>

                  <div className={`mt-5 break-all text-[2rem] font-black leading-none tracking-tight sm:text-[2.5rem] ${visual.amountClass}`}>
                    {item.threshold === 0 ? '0đ' : fmt(item.threshold)}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.2em]">
                    {item.rank === 'MEMBER' ? 'Mốc khởi tạo' : `Để hiển thị ${item.rank}`}
                  </div>

                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/80">
                    <div className={`h-full w-full rounded-full bg-gradient-to-r ${visual.railClass}`}></div>
                  </div>

                  <p className="mt-5 text-sm leading-6 text-slate-600">{item.description}</p>

                  <div className="mt-5 rounded-xl border border-white/80 bg-white/80 px-4 py-3 text-sm text-slate-700">
                    {item.next === 'MAX' ? 'Đây là cấp cao nhất đang hiển thị trên portal.' : `Sau khi đang ở ${item.rank}, portal sẽ tiếp tục theo dõi mục tiêu lên ${item.next}.`}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-8 grid gap-4 2xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm sm:p-6 md:p-8">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 sm:text-xs sm:tracking-[0.2em]">Đang có trên web</div>
            <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">Những gì người dùng nhìn thấy được ngay</h2>
            <div className="mt-6 space-y-3">
              {availableNow.map((item) => (
                <div key={item} className="rounded-xl border border-emerald-100 bg-white/80 px-4 py-4 text-sm leading-6 text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6 md:p-8">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700 sm:text-xs sm:tracking-[0.2em]">Chưa thể hiện rõ</div>
            <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">Những gì chưa nên hứa trong landing page</h2>
            <div className="mt-6 space-y-3">
              {notShownYet.map((item) => (
                <div key={item} className="rounded-xl border border-amber-100 bg-white/80 px-4 py-4 text-sm leading-6 text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 md:p-8">
          <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-end 2xl:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.2em]">Đi nhanh đến đúng chỗ</div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Xem đúng màn hình đang chạy thật</h2>
            </div>
            <div className="max-w-2xl text-sm leading-6 text-slate-500 2xl:max-w-lg">
              Nếu cần đối chiếu chức năng, hãy mở thẳng các màn hình đang hiển thị rank hoặc ưu đãi thật thay vì chỉ đọc phần mô tả.
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`group rounded-2xl border border-slate-200 bg-gradient-to-br ${item.accent} p-5 transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md`}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.2em]">Open</div>
                <div className="mt-3 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{item.title}</div>
                <div className="mt-3 text-sm leading-6 text-slate-600">{item.description}</div>
                <div className="mt-6 text-sm font-semibold text-slate-900 transition group-hover:translate-x-1">
                  Mở trang này
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
