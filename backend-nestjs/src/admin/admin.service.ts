import {
  BadRequestException,
  ConflictException,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async createCustomer(dto: CreateCustomerDto) {
    const name = dto.name?.trim();
    const email = dto.email?.trim().toLowerCase() || null;
    const phone = dto.phone?.trim() || null;
    const address = dto.address?.trim() || null;

    if (!name) {
      throw new BadRequestException('Họ và tên không được để trống');
    }

    if (!phone) {
      throw new BadRequestException('Số điện thoại không được để trống');
    }

    if (email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email },
      });
      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    if (phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone },
      });
      if (existingPhone) {
        throw new ConflictException('Phone number already exists');
      }
    }

    const customer = await this.prisma.user.create({
      data: {
        role: 'CUSTOMER',
        name,
        email,
        phone,
        gender: dto.gender || null,
        dob: dto.dob ? new Date(dto.dob) : null,
        address,
        addressStreet: address,
        onboardingComplete: true,
        referralCode: await this.generateUniqueReferralCode(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gender: true,
        dob: true,
        referralCode: true,
        createdAt: true,
      },
    });

    return { success: true, customer };
  }

  async getDashboardStats(user: any, effectiveStoreId: string | null) {
    const orderWhere: any = effectiveStoreId ? { storeId: effectiveStoreId } : {};
    const customerWhere: any = { role: 'CUSTOMER' };
    if (effectiveStoreId) {
      customerWhere.orders = { some: { storeId: effectiveStoreId } };
    }

    const [
      totalCustomers,
      newCustomersThisMonth,
      totalOrders,
      completedOrders,
      totalRevenue,
      activeVouchers,
      pendingCommissions,
      recentOrders,
      topCustomers,
    ] = await Promise.all([
      this.prisma.user.count({ where: customerWhere }),
      this.prisma.user.count({
        where: {
          ...customerWhere,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      this.prisma.order.count({ where: orderWhere }),
      this.prisma.order.count({
        where: { ...orderWhere, status: 'COMPLETED' },
      }),
      this.prisma.order.aggregate({
        where: { ...orderWhere, status: 'COMPLETED' },
        _sum: { totalAmount: true },
      }),
      this.prisma.voucher.count({ where: { isActive: true } }),
      this.prisma.commissionLedger.aggregate({
        where: {
          status: 'PENDING',
          ...(effectiveStoreId ? { order: { storeId: effectiveStoreId } } : {}),
        },
        _sum: { amount: true },
      }),
      this.prisma.order.findMany({
        where: orderWhere,
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, phone: true, rank: true } },
        },
      }),
      this.prisma.user.findMany({
        where: customerWhere,
        take: 5,
        orderBy: { totalSpent: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          rank: true,
          totalSpent: true,
          _count: { select: { orders: { where: orderWhere } } },
        },
      }),
    ]);

    return {
      totalCustomers,
      newCustomersThisMonth,
      totalOrders,
      completedOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      activeVouchers,
      pendingCommissions: pendingCommissions._sum.amount || 0,
      recentOrders,
      topCustomers,
    };
  }

  async getCustomers(
    user: any,
    effectiveStoreId: string | null,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      rank?: string;
      includeAll?: boolean;
    },
  ) {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const search = params?.search || '';
    const rank = params?.rank || '';

    const where: any = { role: 'CUSTOMER' };

    if (effectiveStoreId && !params?.includeAll) {
      where.orders = { some: { storeId: effectiveStoreId } };
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (rank) {
      where.rank = rank;
    }

    const [customers, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          gender: true,
          dob: true,
          rank: true,
          totalSpent: true,
          commissionBalance: true,
          referralCode: true,
          addressStreet: true,
          addressWard: true,
          addressProvince: true,
          createdAt: true,
          _count: { select: { orders: true, referees: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDashboardMeta(user: any, effectiveStoreId: string | null) {
    let unreadCount = 0;
    let pendingStoresCount = 0;
    let isStoreActive = true;

    if (user.role === 'ADMIN' || (user.role === 'STAFF' && !effectiveStoreId)) {
      const [uCount, pCount] = await Promise.all([
        this.prisma.order.count({ where: { isRead: false } }),
        this.prisma.store.count({
          where: { isActive: false, isBanned: false },
        }),
      ]);
      unreadCount = uCount;
      pendingStoresCount = pCount;
    } else if (effectiveStoreId) {
      const [uCount, store] = await Promise.all([
        this.prisma.order.count({
          where: { storeId: effectiveStoreId, isRead: false },
        }),
        this.prisma.store.findUnique({
          where: { id: effectiveStoreId },
          select: { isActive: true },
        }),
      ]);
      unreadCount = uCount;
      isStoreActive = store?.isActive ?? false;
    }

    return { unreadCount, pendingStoresCount, isStoreActive };
  }

  async getCustomerDetail(id: string, user: any, effectiveStoreId: string | null) {
    if (effectiveStoreId) {
      const hasOrder = await this.prisma.order.findFirst({
        where: { userId: id, storeId: effectiveStoreId },
      });
      if (!hasOrder) {
        return null;
      }
    }

    const orderWhere = effectiveStoreId ? { storeId: effectiveStoreId } : {};

    const customer = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gender: true,
        dob: true,
        rank: true,
        totalSpent: true,
        commissionBalance: true,
        referralCode: true,
        addressStreet: true,
        addressWard: true,
        addressProvince: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        referrer: {
          select: { id: true, name: true, phone: true, referralCode: true },
        },
        referees: {
          select: {
            id: true, name: true, phone: true, rank: true, totalSpent: true, createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        orders: {
          where: orderWhere,
          select: {
            id: true, orderCode: true, totalAmount: true, status: true,
            paymentStatus: true, source: true, createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        commissionsEarned: {
          where: effectiveStoreId ? { order: { storeId: effectiveStoreId } } : {},
          select: {
            id: true, amount: true, percentage: true, level: true,
            status: true, createdAt: true,
            order: { select: { orderCode: true, totalAmount: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        userVouchers: {
          select: {
            id: true, isUsed: true, usedAt: true, createdAt: true,
            voucher: { select: { code: true, type: true, value: true, validTo: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { 
            orders: { where: orderWhere }, 
            referees: true, 
            commissionsEarned: { where: effectiveStoreId ? { order: { storeId: effectiveStoreId } } : {} }, 
            userVouchers: true 
          },
        },
      },
    });

    if (!customer) {
      return null;
    }

    // Aggregate stats
    const [orderStats, commissionStats] = await Promise.all([
      this.prisma.order.aggregate({
        where: { userId: id, status: 'COMPLETED', ...orderWhere },
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.commissionLedger.aggregate({
        where: { userId: id, status: 'PAID', ...(effectiveStoreId ? { order: { storeId: effectiveStoreId } } : {}) },
        _sum: { amount: true },
      }),
    ]);

    return {
      ...customer,
      stats: {
        completedOrders: orderStats._count,
        completedRevenue: orderStats._sum.totalAmount || 0,
        totalCommission: commissionStats._sum.amount || 0,
      },
    };
  }

  private async generateUniqueReferralCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    while (true) {
      let code = '';
      for (let i = 0; i < 8; i += 1) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const existing = await this.prisma.user.findUnique({
        where: { referralCode: code },
      });

      if (!existing) {
        return code;
      }
    }
  }

  async softDeleteCustomer(id: string, user?: any, effectiveStoreId?: string | null) {
    const customer = await this.prisma.user.findUnique({
      where: { id },
      select: { role: true, isActive: true },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    if (customer.role !== 'CUSTOMER') {
      throw new BadRequestException('Can only soft delete customers');
    }

    // If MODERATOR, verify ownership
    if (user?.role === 'MODERATOR' && effectiveStoreId) {
      const hasOrder = await this.prisma.order.findFirst({
        where: { userId: id, storeId: effectiveStoreId },
      });
      if (!hasOrder) {
        throw new ForbiddenException('You can only ban customers associated with your store');
      }
    }

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true, message: 'Customer has been banned (soft deleted)' };
  }

  async hardDeleteCustomer(id: string, user?: any, effectiveStoreId?: string | null) {
    const customer = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    if (customer.role !== 'CUSTOMER') {
      throw new BadRequestException('Can only delete customers');
    }

    // If MODERATOR, verify they have authority over this customer (e.g., customer has orders in their store)
    if (user?.role === 'MODERATOR' && effectiveStoreId) {
      const hasOrder = await this.prisma.order.findFirst({
        where: { userId: id, storeId: effectiveStoreId },
      });
      if (!hasOrder) {
        throw new ForbiddenException('You can only delete customers associated with your store');
      }
    }

    return this.deleteUserPermanently(id);
  }

  private async deleteUserPermanently(userId: string) {
    // Delete related records first (cascade delete)
    await this.prisma.$transaction([
      this.prisma.cartItem.deleteMany({ where: { cart: { userId } } }),
      this.prisma.cart.deleteMany({ where: { userId } }),
      this.prisma.userVoucher.deleteMany({ where: { userId } }),
      this.prisma.commissionLedger.deleteMany({ where: { userId } }),
      this.prisma.review.deleteMany({ where: { userId } }),
      this.prisma.wishlist.deleteMany({ where: { userId } }),
      this.prisma.notification.deleteMany({ where: { userId } }),
      this.prisma.oAuthAccount.deleteMany({ where: { userId } }),
      this.prisma.user.updateMany({
        where: { referrerId: userId },
        data: { referrerId: null },
      }),
      // Finally delete the user
      this.prisma.user.delete({ where: { id: userId } }),
    ]);

    return { success: true, message: 'User has been permanently deleted' };
  }

  async getSystemConfig(key: string) {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
    });
    return config || { key, value: null };
  }

  async upsertSystemConfig(key: string, value: any) {
    return this.prisma.systemConfig.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }


  async getStoreStaff(storeId?: string) {
    const where: any = { role: 'STAFF' };
    if (storeId) {
      where.staffStoreId = storeId;
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        staffStoreId: true,
        staffPermissions: true,
        createdAt: true,
        _count: {
          select: { ordersAsSeller: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all users with roles ADMIN, MODERATOR, STAFF that are associated with a store.
   * Used for the "NV xử lý" dropdown in order creation.
   */
  async getStoreMembers(storeId?: string) {
    if (!storeId) {
      // No storeId provided: find the first available store
      const firstStore = await this.prisma.store.findFirst({
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });
      if (!firstStore) {
        return [];
      }
      storeId = firstStore.id;
    }

    // With storeId: only users linked to this specific store
    return this.prisma.user.findMany({
      where: {
        OR: [
          // STAFF assigned to this store
          { role: 'STAFF', staffStoreId: storeId },
          // MODERATOR who owns this store
          { role: 'MODERATOR', store: { id: storeId } },
          // ADMIN assigned to this store as staff
          { role: 'ADMIN', staffStoreId: storeId },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        staffStoreId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeStaff(staffId: string, moderatorStoreId?: string) {
    const staff = await this.prisma.user.findUnique({
      where: { id: staffId },
      select: { role: true, staffStoreId: true },
    });

    if (!staff || staff.role !== 'STAFF') {
      throw new BadRequestException('Staff member not found');
    }

    if (moderatorStoreId && staff.staffStoreId !== moderatorStoreId) {
      throw new ForbiddenException('You can only remove staff from your own store');
    }

    return this.deleteUserPermanently(staffId);
  }

  async createStaff(dto: CreateStaffDto) {
    const { name, email, phone, password, storeId } = dto;

    if (!storeId) {
      throw new BadRequestException('Vui lòng chọn cửa hàng cho nhân viên');
    }

    // Check if email already exists
    if (email) {
      const existingEmail = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    // Check if phone already exists
    const existingPhone = await this.prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      throw new ConflictException('Phone number already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const staffPermissions = [
      'CUSTOMERS_VIEW', 'CUSTOMERS_MANAGE',
      'ORDERS_VIEW', 'ORDERS_MANAGE',
      'PRODUCTS_VIEW', 'PRODUCTS_MANAGE',
      'CATEGORIES_VIEW', 'CATEGORIES_MANAGE'
    ];

    return this.prisma.user.create({
      data: {
        name,
        email: email?.toLowerCase(),
        phone,
        password: hashedPassword,
        role: 'STAFF',
        staffStoreId: storeId || null,
        staffPermissions,
        onboardingComplete: true,
        referralCode: await this.generateUniqueReferralCode(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        staffStoreId: true,
        staffPermissions: true,
      },
    });
  }

  async assignStaff(dto: { userId: string; storeId: string }) {
    const { userId, storeId } = dto;
    const staffPermissions = [
      'CUSTOMERS_VIEW', 'CUSTOMERS_MANAGE',
      'ORDERS_VIEW', 'ORDERS_MANAGE',
      'PRODUCTS_VIEW', 'PRODUCTS_MANAGE',
      'CATEGORIES_VIEW', 'CATEGORIES_MANAGE'
    ];

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        role: 'STAFF',
        staffStoreId: storeId,
        staffPermissions,
      },
    });
  }
}
