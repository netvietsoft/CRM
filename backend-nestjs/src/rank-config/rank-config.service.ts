import { Injectable } from '@nestjs/common';
import { Rank, RankConfig } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateRankConfigDto } from './dto/update-rank-config.dto';

type RankProgress = {
  currentRank: Rank;
  currentThreshold: number;
  nextRank: Rank | 'MAX';
  nextThreshold: number;
  progressPercent: number;
  remainingToNext: number;
};

const DEFAULT_RANK_CONFIGS: Array<{
  rank: Rank;
  minTotalSpent: number;
  description: string;
}> = [
  { rank: 'MEMBER', minTotalSpent: 0, description: 'Hạng mặc định cho tài khoản mới.' },
  {
    rank: 'SILVER',
    minTotalSpent: 2_000_000,
    description: 'Mốc khách hàng bắt đầu tích lũy ổn định.',
  },
  {
    rank: 'GOLD',
    minTotalSpent: 5_000_000,
    description: 'Mốc khách hàng có giá trị mua hàng cao hơn trung bình.',
  },
  {
    rank: 'DIAMOND',
    minTotalSpent: 10_000_000,
    description: 'Mốc khách hàng ưu tiên với tổng chi tiêu lớn.',
  },
  { rank: 'PLATINUM', minTotalSpent: 20_000_000, description: 'Hạng cao nhất hiện đang áp dụng.' },
];

@Injectable()
export class RankConfigService {
  constructor(private prisma: PrismaService) {}

  async ensureDefaults() {
    const count = await this.prisma.rankConfig.count();
    if (count > 0) return;

    await this.prisma.rankConfig.createMany({
      data: DEFAULT_RANK_CONFIGS,
    });
  }

  async findAll() {
    await this.ensureDefaults();

    return this.prisma.rankConfig.findMany({
      orderBy: { minTotalSpent: 'asc' },
    });
  }

  async upsert(updateDto: UpdateRankConfigDto) {
    await this.ensureDefaults();

    const config = await this.prisma.rankConfig.upsert({
      where: { rank: updateDto.rank },
      create: {
        rank: updateDto.rank,
        minTotalSpent: updateDto.minTotalSpent,
        minOrdersMonth: updateDto.minOrdersMonth ?? null,
        discountPercent: updateDto.discountPercent ?? null,
        description: updateDto.description?.trim() || null,
      },
      update: {
        minTotalSpent: updateDto.minTotalSpent,
        minOrdersMonth: updateDto.minOrdersMonth ?? null,
        discountPercent: updateDto.discountPercent ?? null,
        description: updateDto.description?.trim() || null,
      },
    });

    await this.recalculateAllUserRanks();

    return config;
  }

  resolveRank(totalSpent: number, configs: RankConfig[]): Rank {
    const sortedConfigs = [...configs].sort((a, b) => b.minTotalSpent - a.minTotalSpent);

    for (const config of sortedConfigs) {
      if (totalSpent >= config.minTotalSpent) {
        return config.rank;
      }
    }

    return 'MEMBER';
  }

  buildRankProgress(totalSpent: number, configs: RankConfig[]): RankProgress {
    const sortedConfigs = [...configs].sort((a, b) => a.minTotalSpent - b.minTotalSpent);
    const currentRank = this.resolveRank(totalSpent, sortedConfigs);
    const currentConfig =
      sortedConfigs.find((config) => config.rank === currentRank) ?? sortedConfigs[0] ?? null;
    const currentIndex = currentConfig
      ? sortedConfigs.findIndex((config) => config.rank === currentConfig.rank)
      : -1;
    const nextConfig =
      currentIndex >= 0 && currentIndex < sortedConfigs.length - 1
        ? sortedConfigs[currentIndex + 1]
        : null;

    if (!currentConfig) {
      return {
        currentRank,
        currentThreshold: 0,
        nextRank: 'MAX',
        nextThreshold: 0,
        progressPercent: 100,
        remainingToNext: 0,
      };
    }

    if (!nextConfig) {
      return {
        currentRank,
        currentThreshold: currentConfig.minTotalSpent,
        nextRank: 'MAX',
        nextThreshold: currentConfig.minTotalSpent,
        progressPercent: 100,
        remainingToNext: 0,
      };
    }

    const span = Math.max(nextConfig.minTotalSpent - currentConfig.minTotalSpent, 1);
    const progressed = Math.min(Math.max(totalSpent - currentConfig.minTotalSpent, 0), span);

    return {
      currentRank,
      currentThreshold: currentConfig.minTotalSpent,
      nextRank: nextConfig.rank,
      nextThreshold: nextConfig.minTotalSpent,
      progressPercent: Math.min(100, (progressed / span) * 100),
      remainingToNext: Math.max(nextConfig.minTotalSpent - totalSpent, 0),
    };
  }

  async recalculateAllUserRanks() {
    const [configs, users] = await Promise.all([
      this.findAll(),
      this.prisma.user.findMany({
        select: {
          id: true,
          totalSpent: true,
        },
      }),
    ]);

    if (users.length === 0) return;

    await this.prisma.$transaction(
      users.map((user) =>
        this.prisma.user.update({
          where: { id: user.id },
          data: {
            rank: this.resolveRank(user.totalSpent, configs),
            points: Math.floor(user.totalSpent / 10000),
          },
        }),
      ),
    );
  }
}
