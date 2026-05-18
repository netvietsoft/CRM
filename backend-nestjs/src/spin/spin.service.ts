import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SpinService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all active spin prizes
   */
  async getPrizes() {
    return this.prisma.spinPrize.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
        type: true,
        value: true,
        probability: true,
      },
    });
  }

  /**
   * Get user's recent spin history
   */
  async getHistory(userId: string, limit = 10) {
    return this.prisma.spinHistory.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        prize: {
          select: {
            name: true,
            type: true,
            value: true,
          },
        },
      },
    });
  }

  /**
   * Get user's spin attempts
   */
  async getUserSpinAttempts(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        spinTurns: true,
      },
    });

    return {
      spinAttempts: user?.spinTurns || 0,
    };
  }

  /**
   * Spin the wheel
   */
  async spin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        spinTurns: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.spinTurns <= 0) {
      throw new ForbiddenException('Bạn đã hết lượt quay');
    }

    // Get active prizes from database
    const dbPrizes = await this.prisma.spinPrize.findMany({
      where: { isActive: true },
    });

    if (dbPrizes.length === 0) {
      throw new BadRequestException('Vòng quay hiện đang bảo trì');
    }

    // Random selection based on probability
    const random = Math.random();
    let cumulativeProbability = 0;
    let selectedPrize = dbPrizes[dbPrizes.length - 1]; // Fallback

    for (const prize of dbPrizes) {
      cumulativeProbability += prize.probability;
      if (random <= cumulativeProbability) {
        selectedPrize = prize;
        break;
      }
    }

    const won = selectedPrize.type !== 'NONE';

    // Atomic transaction for spin results
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Decrease spin attempts
      await tx.user.update({
        where: { id: userId },
        data: {
          spinTurns: { decrement: 1 },
        },
      });

      // 2. Record history
      const history = await tx.spinHistory.create({
        data: {
          userId,
          prizeId: selectedPrize.id,
          won,
        },
      });

      // 3. Apply prize if won
      let rewardMessage = selectedPrize.name;
      let voucherCode = null;

      if (won) {
        // Increment won count
        await tx.spinPrize.update({
          where: { id: selectedPrize.id },
          data: { wonCount: { increment: 1 } },
        });

        if (selectedPrize.type === 'POINTS' && selectedPrize.value) {
          await tx.user.update({
            where: { id: userId },
            data: { points: { increment: selectedPrize.value } },
          });
          rewardMessage = `Chúc mừng! Bạn nhận được ${selectedPrize.value} điểm`;
        } else if (selectedPrize.type === 'VOUCHER' && selectedPrize.voucherId) {
          // Fetch template voucher
          const template = await tx.voucher.findUnique({
            where: { id: selectedPrize.voucherId },
          });

          if (template) {
            const code = `SPIN-${Date.now()}-${userId.slice(0, 4)}`;
            const newVoucher = await tx.voucher.create({
              data: {
                ...template,
                id: undefined, // Let DB generate new ID
                code,
                name: `${template.name} (Từ Vòng Quay)`,
                isActive: true,
                usedCount: 0,
                validFrom: new Date(),
                validTo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
              } as any,
            });

            await tx.userVoucher.create({
              data: {
                userId,
                voucherId: newVoucher.id,
              },
            });
            voucherCode = code;
            rewardMessage = `Chúc mừng! Bạn nhận được voucher ${newVoucher.name}`;
          }
        }
      }

      const updatedUser = await tx.user.findUnique({
        where: { id: userId },
        select: { spinTurns: true },
      });

      return {
        prizeId: selectedPrize.id,
        prizeName: selectedPrize.name,
        won,
        voucherCode,
        message: rewardMessage,
        remainingTurns: updatedUser?.spinTurns || 0,
      };
    });

    return result;
  }

  /**
   * Add spin attempts to user (Admin only)
   */
  async addSpinAttempts(userId: string, attempts: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        spinTurns: { increment: attempts },
      },
    });
  }

  async findAllAdmin() {
    return this.prisma.spinPrize.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { voucher: true },
    });
  }

  async getStatsAdmin() {
    const [totalSpins, totalWins] = await Promise.all([
      this.prisma.spinHistory.count(),
      this.prisma.spinHistory.count({ where: { won: true } }),
    ]);
    return { totalSpins, totalWins };
  }

  async createPrize(data: any) {
    const { voucher, ...prizeData } = data;

    return this.prisma.$transaction(async (tx) => {
      let voucherId = null;
      if (prizeData.type === 'VOUCHER' && voucher) {
        const newVoucher = await tx.voucher.create({
          data: {
            ...voucher,
            isActive: false, // Template voucher is inactive
            isStackable: voucher.isStackable ?? false,
          },
        });
        voucherId = newVoucher.id;
      }

      // Get current max sortOrder
      const lastPrize = await tx.spinPrize.findFirst({
        orderBy: { sortOrder: 'desc' },
      });
      const sortOrder = (lastPrize?.sortOrder || 0) + 1;

      return tx.spinPrize.create({
        data: {
          ...prizeData,
          voucherId,
          sortOrder,
        },
        include: { voucher: true },
      });
    });
  }

  async updatePrize(id: string, data: any) {
    const { voucher, ...prizeData } = data;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.spinPrize.findUnique({
        where: { id },
        include: { voucher: true },
      });

      if (!existing) throw new BadRequestException('Prize not found');

      if (prizeData.type === 'VOUCHER' && voucher) {
        if (existing.voucherId) {
          await tx.voucher.update({
            where: { id: existing.voucherId },
            data: { ...voucher },
          });
        } else {
          const newVoucher = await tx.voucher.create({
            data: {
              ...voucher,
              isActive: false,
            },
          });
          prizeData.voucherId = newVoucher.id;
        }
      }

      return tx.spinPrize.update({
        where: { id },
        data: { ...prizeData },
        include: { voucher: true },
      });
    });
  }

  async removePrize(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.spinPrize.findUnique({
        where: { id },
      });
      if (!existing) throw new BadRequestException('Prize not found');

      // Delete prize
      const deleted = await tx.spinPrize.delete({ where: { id } });

      // If it has a voucher template, maybe keep it or delete it? 
      // Usually template vouchers are unique to the prize, so we delete.
      if (existing.voucherId) {
        await tx.voucher.delete({ where: { id: existing.voucherId } }).catch(() => {
          // If voucher is being used or something, just ignore
        });
      }

      return deleted;
    });
  }
}
