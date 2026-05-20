export type MembershipRank = 'MEMBER' | 'SILVER' | 'GOLD' | 'DIAMOND' | 'PLATINUM';

export type MembershipProgress = {
  next: MembershipRank | 'MAX';
  target: number;
};

export const membershipProgressMap: Record<MembershipRank, MembershipProgress> = {
  MEMBER: { next: 'SILVER', target: 2000000 },
  SILVER: { next: 'GOLD', target: 5000000 },
  GOLD: { next: 'DIAMOND', target: 10000000 },
  DIAMOND: { next: 'PLATINUM', target: 20000000 },
  PLATINUM: { next: 'MAX', target: 0 },
};

export const membershipBadgeClassMap: Record<MembershipRank, string> = {
  MEMBER: 'bg-gray-50 text-gray-700 border-gray-200',
  SILVER: 'bg-gray-100 text-gray-800 border-gray-300',
  GOLD: 'bg-amber-50 text-amber-700 border-amber-200',
  DIAMOND: 'bg-blue-50 text-blue-700 border-blue-200',
  PLATINUM: 'bg-purple-50 text-purple-700 border-purple-200',
};

export const membershipLevels: Array<{
  rank: MembershipRank;
  target: number;
  next: MembershipRank | 'MAX';
  title: string;
  description: string;
}> = [
  {
    rank: 'MEMBER',
    target: 2000000,
    next: 'SILVER',
    title: 'Khởi đầu của mọi tài khoản',
    description: 'Ngay sau khi đăng ký, tài khoản bắt đầu ở hạng MEMBER và có thể theo dõi tiến độ nâng hạng trong portal.',
  },
  {
    rank: 'SILVER',
    target: 5000000,
    next: 'GOLD',
    title: 'Mốc chi tiêu kế tiếp',
    description: 'Khi giao diện đã lên SILVER, thanh tiến độ tiếp tục hiển thị mục tiêu kế tiếp để lên GOLD.',
  },
  {
    rank: 'GOLD',
    target: 10000000,
    next: 'DIAMOND',
    title: 'Tiếp tục theo dõi trên dashboard và hồ sơ',
    description: 'Trang dashboard và hồ sơ đều dùng cùng mốc 30 ngày gần nhất để hiển thị tiến độ lên DIAMOND.',
  },
  {
    rank: 'DIAMOND',
    target: 20000000,
    next: 'PLATINUM',
    title: 'Mốc trước hạng cao nhất',
    description: 'Ở DIAMOND, giao diện tiếp tục hiển thị phần chi tiêu còn thiếu để lên PLATINUM.',
  },
  {
    rank: 'PLATINUM',
    target: 0,
    next: 'MAX',
    title: 'Hạng cao nhất đang hiển thị trên portal',
    description: 'Khi đạt PLATINUM, thanh tiến độ dừng ở mức tối đa và hiển thị trạng thái đã đạt cấp bậc cao nhất.',
  },
];

export function getMembershipStatus(rank: string | null | undefined, rawSpentInLast30Days: number) {
  const spentInLast30Days = Number.isFinite(rawSpentInLast30Days) ? Math.max(0, rawSpentInLast30Days) : 0;
  let effectiveRank: MembershipRank = isMembershipRank(rank) ? rank : 'MEMBER';
  let progress = membershipProgressMap[effectiveRank];

  while (progress.target > 0 && spentInLast30Days >= progress.target && progress.next !== 'MAX') {
    effectiveRank = progress.next;
    progress = membershipProgressMap[effectiveRank];
  }

  const percentage = progress.target > 0 ? Math.min(100, (spentInLast30Days / progress.target) * 100) : 100;

  return {
    effectiveRank,
    progress,
    spentInLast30Days,
    percentage,
  };
}

function isMembershipRank(rank: string | null | undefined): rank is MembershipRank {
  return rank === 'MEMBER' || rank === 'SILVER' || rank === 'GOLD' || rank === 'DIAMOND' || rank === 'PLATINUM';
}
