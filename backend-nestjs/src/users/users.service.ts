import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async updateUserRank(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totalSpent: true, rank: true },
    });

    if (!user) return;

    // Get rank configs ordered by minTotalSpent descending
    const rankConfigs = await this.prisma.rankConfig.findMany({
      orderBy: { minTotalSpent: 'desc' },
    });

    // Find appropriate rank
    let newRank = 'MEMBER';
    for (const config of rankConfigs) {
      if (user.totalSpent >= config.minTotalSpent) {
        newRank = config.rank;
        break;
      }
    }

    // Update user rank and points
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        rank: newRank as any,
        points: Math.floor(user.totalSpent / 10000),
      },
    });
  }

  async findById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        rank: true,
        totalSpent: true,
        commissionBalance: true,
        referralCode: true,
        avatarUrl: true,
        gender: true,
        dob: true,
        address: true,
        addressStreet: true,
        addressWard: true,
        addressDistrict: true,
        addressProvince: true,
        onboardingComplete: true,
        isActive: true,
        createdAt: true,
        store: {
          select: { id: true, name: true, slug: true }
        },
        staffStoreId: true,
        staffStore: {
          select: { id: true, name: true, slug: true }
        }
      },
    });
  }

  /**
   * Get detailed profile with OAuth accounts
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gender: true,
        dob: true,
        address: true,
        addressStreet: true,
        addressWard: true,
        addressDistrict: true,
        addressProvince: true,
        avatarUrl: true,
        createdAt: true,
        interests: true,
        onboardingComplete: true,
        role: true,
        referralCode: true,
        oauthAccounts: {
          select: { provider: true }
        }
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: any) {
    const { name, email, phone, gender, dob, addressStreet, addressWard, addressProvince } = data;

    if (!name) {
      throw new BadRequestException('Tên không được để trống');
    }

    // Check if email or phone is already used by another user
    if (email) {
      const existingEmail = await this.prisma.user.findFirst({
        where: { email, id: { not: userId } },
      });
      if (existingEmail) {
        throw new BadRequestException('Email này đã được sử dụng');
      }
    }

    if (phone) {
      const existingPhone = await this.prisma.user.findFirst({
        where: { phone, id: { not: userId } },
      });
      if (existingPhone) {
        throw new BadRequestException('Số điện thoại này đã được sử dụng');
      }
    }

    const validGender = gender === 'MALE' || gender === 'FEMALE' || gender === 'OTHER' ? gender : null;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email: email || null,
        phone: phone || null,
        gender: validGender,
        dob: dob ? new Date(dob) : null,
        addressStreet: addressStreet || null,
        addressWard: addressWard || null,
        addressDistrict: null, // CLEAR DISTRICT
        addressProvince: addressProvince || null,
      },
    });

    return { success: true };
  }

  /**
   * Update user password
   */
  async updatePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!currentPassword || !newPassword) {
      throw new BadRequestException('Vui lòng điền đầy đủ thông tin');
    }

    if (newPassword.length < 6) {
      throw new BadRequestException('Mật khẩu mới phải có ít nhất 6 ký tự');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user || !user.password) {
      // If user logs in via Social, they might not have a password
      throw new BadRequestException('Không thể đổi mật khẩu cho tài khoản này');
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true };
  }

  /**
   * Complete onboarding
   */
  async completeOnboarding(userId: string, data: any) {
    const { gender, dob, interests, phone } = data;

    // Validate interests (can be empty now)
    if (!Array.isArray(interests)) {
      throw new BadRequestException('Interests must be an array');
    }

    // Process phone sync
    if (phone) {
      const existingPhone = await this.prisma.user.findFirst({
        where: { phone, id: { not: userId } }
      });
      if (existingPhone) {
        throw new BadRequestException('Số điện thoại này đã được sử dụng ở tài khoản khác');
      }
    }

    // Update user profile
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        gender: gender || null,
        dob: dob ? new Date(dob) : null,
        interests: interests.length > 0 ? interests : undefined,
        phone: phone || undefined,
        onboardingComplete: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        gender: true,
        dob: true,
        interests: true,
        phone: true,
        onboardingComplete: true,
      },
    });

    return {
      message: 'Onboarding completed successfully',
      user: updatedUser,
      shouldSyncPancake: !!updatedUser.phone, // Return flag for frontend to trigger sync
    };
  }

  async getPortalDashboard(userId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [user, voucherCount, orderCount, refereeCount, recentOrders, spentLast30Days] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          totalSpent: true,
          rank: true,
          commissionBalance: true,
          points: true,
          referralCode: true,
          dob: true,
        },
      }),
      this.prisma.userVoucher.count({
        where: { userId, isUsed: false },
      }),
      this.prisma.order.count({
        where: { userId },
      }),
      this.prisma.user.count({
        where: { referrerId: userId },
      }),
      this.prisma.order.findMany({
        where: { userId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderCode: true,
          totalAmount: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.order.aggregate({
        where: {
          userId,
          status: { in: ['COMPLETED', 'DELIVERED'] },
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      user,
      voucherCount,
      orderCount,
      refereeCount,
      recentOrders,
      spentInLast30Days: spentLast30Days._sum.totalAmount || 0,
    };
  }

  async getPortalLayoutMeta(userId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [user, cart, spentLast30Days, store] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          onboardingComplete: true,
          rank: true,
        },
      }),
      this.prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            select: { quantity: true },
          },
        },
      }),
      this.prisma.order.aggregate({
        where: {
          userId,
          status: { in: ['COMPLETED', 'DELIVERED'] },
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.store.findUnique({
        where: { ownerId: userId },
        select: { id: true, name: true, isActive: true },
      }),
    ]);

    const cartItemCount = cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;

    return {
      onboardingComplete: user?.onboardingComplete || false,
      rank: user?.rank || 'MEMBER',
      cartItemCount,
      spentInLast30Days: spentLast30Days._sum.totalAmount || 0,
      hasStore: !!store,
      store: store || null,
    };
  }
}
