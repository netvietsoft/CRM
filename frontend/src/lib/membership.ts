export type MembershipRank = 'MEMBER' | 'SILVER' | 'GOLD' | 'DIAMOND' | 'PLATINUM';

export interface MembershipConfig {
  rank: MembershipRank;
  minTotalSpent: number;
  minOrdersMonth?: number | null;
  discountPercent?: number | null;
  description?: string | null;
}

export interface MembershipProgress {
  currentRank: MembershipRank;
  currentThreshold: number;
  nextRank: MembershipRank | 'MAX';
  nextThreshold: number;
  progressPercent: number;
  remainingToNext: number;
}

export const membershipBadgeClassMap: Record<MembershipRank, string> = {
  MEMBER: 'bg-gray-50 text-gray-700 border-gray-200',
  SILVER: 'bg-gray-100 text-gray-800 border-gray-300',
  GOLD: 'bg-amber-50 text-amber-700 border-amber-200',
  DIAMOND: 'bg-blue-50 text-blue-700 border-blue-200',
  PLATINUM: 'bg-purple-50 text-purple-700 border-purple-200',
};

function isMembershipRank(rank: string | null | undefined): rank is MembershipRank {
  return rank === 'MEMBER' || rank === 'SILVER' || rank === 'GOLD' || rank === 'DIAMOND' || rank === 'PLATINUM';
}

export function normalizeMembershipConfigs(configs: MembershipConfig[]) {
  return [...configs]
    .filter((config) => isMembershipRank(config.rank))
    .sort((a, b) => a.minTotalSpent - b.minTotalSpent);
}

export function getNextMembershipConfig(
  currentRank: string | null | undefined,
  configs: MembershipConfig[],
) {
  const normalized = normalizeMembershipConfigs(configs);
  const rank = isMembershipRank(currentRank) ? currentRank : 'MEMBER';
  const currentIndex = normalized.findIndex((config) => config.rank === rank);

  if (currentIndex === -1 || currentIndex >= normalized.length - 1) {
    return null;
  }

  return normalized[currentIndex + 1];
}
