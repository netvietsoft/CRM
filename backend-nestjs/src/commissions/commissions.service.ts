import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommissionsService {
  constructor(private prisma: PrismaService) {}

  async calculateCommissions(order: any) {
    try {
      // Get commission configs
      const commissionConfigs = await this.prisma.commissionConfig.findMany({
        where: { isActive: true },
        orderBy: { level: 'asc' },
      });

      if (commissionConfigs.length === 0) return;

      // Get referral chain (ancestors) from ReferralClosure
      const ancestors = await this.prisma.referralClosure.findMany({
        where: {
          descendantId: order.userId,
          depth: { gt: 0 }, // Don't include the user themselves
        },
        orderBy: { depth: 'asc' },
        include: {
          ancestor: {
            select: {
              id: true,
              name: true,
              commissionBalance: true,
            },
          },
        },
      });

      // Calculate commission for each level
      for (const ancestor of ancestors) {
        const config = commissionConfigs.find((c) => c.level === ancestor.depth);
        if (!config) continue;

        const commissionAmount = (order.totalAmount * config.percentage) / 100;

        // Create commission record
        await this.prisma.commissionLedger.create({
          data: {
            userId: ancestor.ancestorId,
            orderId: order.id,
            fromUserId: order.userId,
            level: ancestor.depth,
            percentage: config.percentage,
            amount: commissionAmount,
            status: 'APPROVED', // Auto-approve when order is completed
          },
        });

        // Update commission balance
        await this.prisma.user.update({
          where: { id: ancestor.ancestorId },
          data: {
            commissionBalance: {
              increment: commissionAmount,
            },
          },
        });
      }
    } catch (error) {
      console.error('Error calculating commissions:', error);
      // Don't throw error to avoid affecting order update
    }
  }

  async cancelCommissions(orderId: string) {
    try {
      // Get all commissions for this order
      const commissions = await this.prisma.commissionLedger.findMany({
        where: {
          orderId,
          status: { not: 'CANCELLED' },
        },
      });

      // Cancel each commission record and deduct money
      for (const commission of commissions) {
        // Update commission status to CANCELLED
        await this.prisma.commissionLedger.update({
          where: { id: commission.id },
          data: {
            status: 'CANCELLED',
            reversedAt: new Date(),
          },
        });

        // Deduct commission from recipient
        await this.prisma.user.update({
          where: { id: commission.userId },
          data: {
            commissionBalance: {
              decrement: commission.amount,
            },
          },
        });
      }
    } catch (error) {
      console.error('Error cancelling commissions:', error);
    }
  }

  async getNetwork(userId: string) {
    // Try closure table first (supports multi-level)
    const closures = await this.prisma.referralClosure.findMany({
      where: {
        ancestorId: userId,
        depth: { gt: 0 },
      },
      include: {
        descendant: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            rank: true,
            _count: {
              select: { orders: true },
            },
          },
        },
      },
      orderBy: { depth: 'asc' },
    });

    if (closures.length > 0) {
      return closures.map((c) => ({
        ...c.descendant,
        level: c.depth,
      }));
    }

    // Fallback: query directly from user.referrerId (for users without closure entries)
    const directReferees = await this.prisma.user.findMany({
      where: { referrerId: userId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        rank: true,
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return directReferees.map((r) => ({
      ...r,
      level: 1,
    }));
  }

  async getLedger(userId: string, limit = 20) {
    return this.prisma.commissionLedger.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            orderCode: true,
            totalAmount: true,
          },
        },
      },
    });
  }

  async getConfigs() {
    return this.prisma.commissionConfig.findMany({
      where: { isActive: true },
      orderBy: { level: 'asc' },
    });
  }

  async findAllAdmin(limit = 50) {
    return this.prisma.commissionLedger.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, referralCode: true } },
        order: { select: { orderCode: true, totalAmount: true } },
      },
    });
  }

  async getStatsAdmin() {
    const [total, pending] = await Promise.all([
      this.prisma.commissionLedger.aggregate({
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.commissionLedger.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      total: {
        amount: total._sum.amount || 0,
        count: total._count || 0,
      },
      pending: {
        amount: pending._sum.amount || 0,
        count: pending._count || 0,
      },
    };
  }

  async getAllConfigsAdmin() {
    return this.prisma.commissionConfig.findMany({
      orderBy: { level: 'asc' },
    });
  }

  async getReferralProgramStatsAdmin() {
    const [totalReferrals, totalCommPaid, topReferrersCount] = await Promise.all([
      this.prisma.user.count({ where: { referrerId: { not: null } } }),
      this.prisma.commissionLedger.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
      this.prisma.user.count({
        where: { role: 'CUSTOMER', referees: { some: {} } },
      }),
    ]);

    return {
      totalReferrals,
      totalCommPaid: totalCommPaid._sum.amount || 0,
      topReferrersCount,
    };
  }

  async getTopReferrersAdmin(limit = 50) {
    return this.prisma.user.findMany({
      where: { role: 'CUSTOMER', referees: { some: {} } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        referralCode: true,
        commissionBalance: true,
        rank: true,
        _count: { select: { referees: true } },
      },
      orderBy: { commissionBalance: 'desc' },
      take: limit,
    });
  }

  async updateConfigAdmin(level: number, percentage: number) {
    return this.prisma.commissionConfig.upsert({
      where: { level },
      create: { level, percentage, isActive: true },
      update: { percentage },
    });
  }
}
