import Link from 'next/link';
import { Metadata } from 'next';
import { apiClient } from '@/lib/apiClient';

export const metadata: Metadata = {
  title: 'Cơ chế Affiliate | Customer CRM',
  description: 'Giải thích chi tiết cơ chế hoa hồng F0-F4, phần thưởng referral và cách dùng số dư hoa hồng trong Customer CRM.',
};

export const dynamic = 'force-dynamic';

interface CommissionConfig {
  level: number;
  percentage: number;
}

interface RewardTier {
  milestone: number;
  rewardType: 'SPIN' | 'VOUCHER' | string;
  spinTurns?: number | null;
  voucherName?: string | null;
}

interface ReferralRewardConfig {
  tiers: RewardTier[];
}

const lastUpdated = '20/05/2026';

function getRate(configMap: Map<number, number>, level: number) {
  return configMap.get(level) || 0;
}

function describeReward(tier: RewardTier) {
  if (tier.rewardType === 'SPIN') {
    return `Nhận ${tier.spinTurns || 1} lượt quay may mắn.`;
  }
  if (tier.rewardType === 'VOUCHER') {
    return tier.voucherName || 'Nhận voucher referral theo cấu hình hiện tại.';
  }
  return 'Nhận phần thưởng theo cấu hình hiện tại.';
}

export default async function ReferralGuidePage() {
  let commissionConfigs: CommissionConfig[] = [];
  let rewardConfig: ReferralRewardConfig = { tiers: [] };

  try {
    const [configsData, rewardConfigData] = await Promise.all([
      apiClient.get<CommissionConfig[]>('/commissions/configs'),
      apiClient.get<ReferralRewardConfig>('/vouchers/referral-rewards-config/public').catch(() => ({ tiers: [] })),
    ]);
    commissionConfigs = configsData || [];
    rewardConfig = rewardConfigData || { tiers: [] };
  } catch (error) {
    console.error('Error fetching referral guide data:', error);
  }

  const configMap = new Map(commissionConfigs.map((item) => [item.level, item.percentage]));

  const networkExamples = [
    {
      title: 'Khi F1 mua hàng',
      lines: [`F0 nhận ${getRate(configMap, 1)}% giá trị đơn hàng của F1.`],
    },
    {
      title: 'Khi F2 mua hàng',
      lines: [
        `F1 nhận ${getRate(configMap, 1)}% vì là người giới thiệu trực tiếp của F2.`,
        `F0 nhận ${getRate(configMap, 2)}% vì F0 cách F2 hai tầng.`,
      ],
    },
    {
      title: 'Khi F3 mua hàng',
      lines: [
        `F2 nhận ${getRate(configMap, 1)}%.`,
        `F1 nhận ${getRate(configMap, 2)}%.`,
        `F0 nhận ${getRate(configMap, 3)}%.`,
      ],
    },
    {
      title: 'Khi F4 mua hàng',
      lines: [
        `F3 nhận ${getRate(configMap, 1)}%.`,
        `F2 nhận ${getRate(configMap, 2)}%.`,
        `F1 nhận ${getRate(configMap, 3)}%.`,
        `F0 nhận ${getRate(configMap, 4)}%.`,
      ],
    },
  ];

  const actualBehaviors = [
    'Hoa hồng được tính theo khoảng cách từ người mua lên tuyến trên, dựa trên cấu hình F1-F4 hiện tại.',
    'Hệ thống cộng số tiền hoa hồng vào commissionBalance của người nhận, không tạo voucher tự động từ số dư này.',
    'Phần thưởng referral theo mốc chỉ tính trên số người được mời trực tiếp, tức là tuyến F1 của bạn.',
    'Nếu admin cấu hình mốc thưởng là VOUCHER thì voucher được cấp riêng cho mốc đó. Nếu cấu hình là SPIN thì người giới thiệu nhận lượt quay.',
    'Số dư hoa hồng hiện được dùng trực tiếp ở bước thanh toán trong ô Điểm giảm giá, không phải quy đổi tay sang voucher.',
  ];

  const checkoutRules = [
    'Tại checkout, số tiền dùng từ hoa hồng được nhập trong ô Điểm giảm giá.',
    'Số tiền tối đa có thể dùng bằng số dư hoa hồng hiện có, nhưng không vượt quá số tiền đơn hàng còn lại sau voucher và phí ship.',
    'Nếu đã dùng voucher trước, hệ thống mới tiếp tục tính phần giảm từ số dư hoa hồng.',
    'Sau khi áp dụng, phần giảm này hiển thị riêng trong tóm tắt đơn hàng.',
  ];

  return (
    <div className="min-h-screen bg-white py-6 md:bg-gray-50 md:py-12">
      <div className="mx-auto w-full px-4 md:w-[80%] md:px-0">
        <div className="bg-white p-0 sm:p-6 md:rounded-lg md:border md:border-gray-200 md:p-12 md:shadow-sm">
          <div className="mb-8 border-b border-gray-200 pb-6">
            <h1 className="mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-4xl font-bold text-transparent">
              Cơ chế Affiliate
            </h1>
            <p className="text-lg text-gray-600">
              Giải thích rõ cơ chế hoa hồng đa tầng F0-F4, phần thưởng referral và cách dùng số dư hoa hồng đúng theo chức năng hiện tại của hệ thống.
            </p>
            <p className="mt-2 text-sm text-gray-500">Cập nhật lần cuối: {lastUpdated}</p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                1. Hệ thống đang tính hoa hồng như thế nào
              </h2>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-6">
                <div className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Tỷ lệ hiện tại</div>
                <div className="mt-3 grid gap-4 md:grid-cols-4">
                  {[1, 2, 3, 4].map((level) => (
                    <div key={level} className="rounded-xl border border-white/70 bg-white p-4 text-center shadow-sm">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tầng F{level}</div>
                      <div className="mt-2 text-3xl font-bold text-gray-900">{getRate(configMap, level)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                2. F0-F4 hoạt động ra sao
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {networkExamples.map((item) => (
                  <div key={item.title} className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                    <div className="mb-3 text-lg font-semibold text-gray-900">{item.title}</div>
                    <ul className="list-inside list-disc space-y-2 text-sm leading-6 text-gray-700">
                      {item.lines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                3. Phần thưởng mời bạn mới
              </h2>
              {(rewardConfig.tiers && rewardConfig.tiers.length > 0) ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {rewardConfig.tiers.map((tier) => (
                    <div key={`${tier.milestone}-${tier.rewardType}`} className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                      <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-indigo-700">
                        Mốc {tier.milestone} người trực tiếp
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {tier.rewardType === 'VOUCHER' ? 'Thưởng Voucher' : tier.rewardType === 'SPIN' ? 'Thưởng lượt quay' : 'Thưởng referral'}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-gray-700">{describeReward(tier)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
                  Chưa có cấu hình phần thưởng mốc referral ở thời điểm hiện tại.
                </div>
              )}
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-gray-700">
                Mốc thưởng này đang tính theo số người bạn mời trực tiếp thành công, không cộng dồn theo F2, F3 hay F4.
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                4. Tiền thưởng hiện được dùng như thế nào
              </h2>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                <ul className="list-inside list-disc space-y-3 text-sm leading-6 text-gray-700">
                  {actualBehaviors.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                5. Dùng số dư hoa hồng ở checkout
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                  <div className="mb-3 text-lg font-semibold text-gray-900">Cách dùng</div>
                  <ul className="list-inside list-disc space-y-2 text-sm leading-6 text-gray-700">
                    {checkoutRules.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
                  <div className="mb-3 text-lg font-semibold text-gray-900">Điểm cần nhớ</div>
                  <ul className="list-inside list-disc space-y-2 text-sm leading-6 text-gray-700">
                    <li>Số dư hoa hồng hiện không biến thành voucher hệ thống để bạn đi nhập mã.</li>
                    <li>Nếu bạn thấy voucher referral, đó là phần thưởng mốc do admin cấu hình riêng.</li>
                    <li>Phần giảm từ hoa hồng và phần giảm từ voucher là hai dòng khác nhau trong tóm tắt đơn hàng.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                6. Đi nhanh đến đúng chỗ
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                <Link
                  href="/portal/referral"
                  className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm"
                >
                  <div className="mb-2 text-lg font-semibold text-gray-900">Trang giới thiệu</div>
                  <div className="text-sm text-gray-600">Xem mã giới thiệu, mạng lưới đã mời và lịch sử hoa hồng.</div>
                </Link>
                <Link
                  href="/portal/cart"
                  className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm"
                >
                  <div className="mb-2 text-lg font-semibold text-gray-900">Giỏ hàng và checkout</div>
                  <div className="text-sm text-gray-600">Đi đến bước thanh toán để dùng số dư hoa hồng trong ô Điểm giảm giá.</div>
                </Link>
                <Link
                  href="/portal/vouchers"
                  className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm"
                >
                  <div className="mb-2 text-lg font-semibold text-gray-900">Danh sách voucher</div>
                  <div className="text-sm text-gray-600">Xem các voucher hệ thống, voucher shop và voucher referral nếu được cấp.</div>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
