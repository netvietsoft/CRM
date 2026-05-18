import { Injectable, NotFoundException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

import { MailService } from '../mail/mail.service';
import { AdminNotificationsService } from '../modules/admin-notifications/admin-notifications.service';

@Injectable()
export class StoresService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private adminNotificationsService: AdminNotificationsService,
  ) {}

  async onModuleInit() {
    try {
      const adminStore = await this.prisma.store.findFirst({
        where: { slug: 'admin-global-store' },
      });
      if (adminStore) {
        let newSlug = adminStore.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        if (!newSlug || newSlug === 'admin-global-store') {
          newSlug = `admin-store-${Date.now()}`;
        }
        await this.prisma.store.update({
          where: { id: adminStore.id },
          data: { slug: newSlug, isActive: true },
        });
        console.log(`[StoresService] Fixed admin store slug from admin-global-store to: ${newSlug}`);
      }
    } catch (error) {
      console.error('[StoresService] Error fixing admin store slug:', error);
    }
  }

  /**
   * Get all stores (public)
   */
  async getAllStores() {
    return this.prisma.store.findMany({
      where: { isActive: true },
      include: {
        owner: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get store by ID
   */
  async getStoreById(id: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        products: {
          where: { isActive: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return store;
  }

  /**
   * Get public store by slug
   */
  async getPublicStoreBySlug(slug: string) {
    const store = await this.prisma.store.findUnique({
      where: { slug },
      include: {
        owner: {
          select: { name: true, avatarUrl: true },
        },
        _count: {
          select: { products: true, orders: true },
        },
      },
    });

    if (!store) throw new NotFoundException('Store not found');
    if (!store.isActive || store.isBanned) throw new ForbiddenException('Store is currently unavailable');

    return store;
  }

  /**
   * Get store reviews by store slug
   */
  async getPublicStoreReviews(slug: string) {
    const store = await this.prisma.store.findUnique({
      where: { slug },
      select: { id: true },
    });
    
    if (!store) throw new NotFoundException('Store not found');

    return this.prisma.review.findMany({
      where: { product: { storeId: store.id } },
      include: {
        user: { select: { name: true, avatarUrl: true } },
        product: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  /**
   * Get user's store
   */
  async getUserStore(userId: string) {
    const store = await this.prisma.store.findUnique({
      where: { ownerId: userId },
      include: {
        products: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        integrations: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    return store;
  }

  /**
   * Create a new store
   */
  async createStore(userId: string, data: any) {
    // Check if user already has a store
    const existingStore = await this.prisma.store.findUnique({
      where: { ownerId: userId },
    });

    if (existingStore) {
      throw new ForbiddenException('Bạn đã có cửa hàng rồi');
    }

    const { 
      name, slug, description, addressStreet, addressWard, 
      addressDistrict, addressProvince, phone, email, logoUrl,
      allowCOD, bankName, bankAccountNo, bankOwnerName
    } = data;

    const store = await this.prisma.store.create({
      data: {
        ownerId: userId,
        name,
        slug: slug || (name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()),
        description: description || null,
        addressStreet: addressStreet || null,
        addressWard: addressWard || null,
        addressDistrict: addressDistrict || null,
        addressProvince: addressProvince || null,
        phone: phone || null,
        email: email || null,
        logoUrl: logoUrl || null,
        allowCOD: allowCOD !== undefined ? allowCOD : true,
        bankName: bankName || null,
        bankAccountNo: bankAccountNo || null,
        isActive: false, // Default to false, wait for admin approval
      },
    });

    // Notify admins about new store
    await this.adminNotificationsService.createNotification({
      type: 'CUSTOMER',
      title: 'Cửa hàng mới đăng ký',
      message: `Cửa hàng ${store.name} vừa đăng ký, đang chờ duyệt`,
      link: `/admin/stores?search=${store.slug}`,
      metadata: { storeId: store.id, ownerId: userId, name: store.name },
    });

    return store;
  }

  /**
   * Update store
   */
  async updateStore(userId: string, data: any) {
    const store = await this.prisma.store.findUnique({
      where: { ownerId: userId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const { 
      name, description, addressStreet, addressWard, addressDistrict, 
      addressProvince, phone, email, logoUrl, allowCOD, 
      bankName, bankAccountNo, bankOwnerName, isActive 
    } = data;

    return this.prisma.store.update({
      where: { id: store.id },
      data: {
        name: name || store.name,
        description: description !== undefined ? description : store.description,
        addressStreet: addressStreet !== undefined ? addressStreet : store.addressStreet,
        addressWard: addressWard !== undefined ? addressWard : store.addressWard,
        addressDistrict: addressDistrict !== undefined ? addressDistrict : store.addressDistrict,
        addressProvince: addressProvince !== undefined ? addressProvince : store.addressProvince,
        phone: phone !== undefined ? phone : store.phone,
        email: email !== undefined ? email : store.email,
        logoUrl: logoUrl !== undefined ? logoUrl : store.logoUrl,
        allowCOD: allowCOD !== undefined ? allowCOD : store.allowCOD,
        bankName: bankName !== undefined ? bankName : store.bankName,
        bankAccountNo: bankAccountNo !== undefined ? bankAccountNo : store.bankAccountNo,
        bankOwnerName: bankOwnerName !== undefined ? bankOwnerName : store.bankOwnerName,
        isActive: isActive !== undefined ? isActive : store.isActive,
      },
    });
  }

  /**
   * Create store as Admin (manually assign owner)
   */
  async createStoreAdmin(adminId: string, data: any) {
    const { name, slug, ownerId } = data;
    
    const finalOwnerId = ownerId || adminId;

    // Check if owner already has a store
    const existingStore = await this.prisma.store.findUnique({
      where: { ownerId: finalOwnerId },
    });

    if (existingStore) {
      throw new ForbiddenException('Người dùng này đã có cửa hàng rồi');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: finalOwnerId },
    });
    
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng chủ sở hữu');
    }

    // Upgrade owner to MODERATOR if not already ADMIN or MODERATOR
    if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
      await this.prisma.user.update({
        where: { id: finalOwnerId },
        data: { role: 'MODERATOR' },
      });
    }

    return this.prisma.store.create({
      data: {
        ownerId: finalOwnerId,
        name,
        slug: slug || (name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()),
        isActive: true,
      },
    });
  }

  /**
   * Get all stores for Admin
   */
  async findAllAdmin() {
    return this.prisma.store.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        _count: { select: { products: true, orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get store detail for Admin
   */
  async findAdminStoreDetail(id: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true, phone: true, rank: true, createdAt: true },
        },
        _count: { select: { products: true, orders: true, vouchers: true } },
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { name: true } },
          },
        },
        products: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            categories: { select: { name: true } },
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return store;
  }

  /**
   * Helper to generate a random temporary password
   */
  private generateTempPassword(length: number = 8): string {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Approve store
   */
  async approveStore(id: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: { owner: true },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    if (store.isActive) {
      return store; // Already active
    }

    // Generate temporary password
    const tempPassword = this.generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Prepare moderator account info
    // Format: localPart@admin.com
    let modEmail = '';
    const baseEmail = store.email || store.owner.email || store.slug;
    
    if (baseEmail.includes('@')) {
      const localPart = baseEmail.split('@')[0];
      modEmail = `${localPart}@admin.com`;
    } else {
      modEmail = `${baseEmail}@admin.com`;
    }

    let modPhone = store.phone;

    // Ensure email is unique
    let emailExists = true;
    let counter = 0;
    const baseModEmail = modEmail;
    
    while (emailExists) {
      const existing = await this.prisma.user.findUnique({ where: { email: modEmail } });
      if (existing) {
        counter++;
        const [local, domain] = baseModEmail.split('@');
        modEmail = `${local}${counter}@${domain}`;
      } else {
        emailExists = false;
      }
    }
    
    // Ensure phone is unique
    if (modPhone) {
      let phoneExists = true;
      while (phoneExists) {
        const existing = await this.prisma.user.findUnique({ where: { phone: modPhone } });
        if (existing) {
          modPhone = `0${modPhone}`; // Keep adding 0 prefix until unique
          if (modPhone.length > 20) { // Safety break
            modPhone = null;
            phoneExists = false;
          }
        } else {
          phoneExists = false;
        }
      }
    }

    // Create NEW MODERATOR user
    const modUser = await this.prisma.user.create({
      data: {
        name: `Quản lý - ${store.name}`,
        email: modEmail,
        phone: modPhone,
        password: hashedPassword,
        role: 'MODERATOR',
        referralCode: `MOD${Math.floor(Math.random() * 90000) + 10000}`,
        onboardingComplete: true,
      },
    });

    // Update store: Activate and switch owner to the new MODERATOR user
    const updatedStore = await this.prisma.store.update({
      where: { id },
      data: { 
        isActive: true,
        ownerId: modUser.id, // Switch owner to the separate manager account
      },
    });

    // Send email to store email (fallback to owner email)
    const targetEmail = store.email || store.owner.email;
    if (targetEmail) {
      await this.mailService.sendModeratorCredentials(
        targetEmail,
        store.name,
        modEmail || modPhone || 'N/A',
        tempPassword,
      );
    }

    return updatedStore;
  }

  /**
   * Update store status (Admin Only)
   */
  async updateStatus(id: string, data: { isActive?: boolean; isBanned?: boolean; bannedReason?: string }) {
    const store = await this.prisma.store.findUnique({
      where: { id },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return this.prisma.store.update({
      where: { id },
      data: {
        isActive: data.isActive !== undefined ? data.isActive : store.isActive,
        isBanned: data.isBanned !== undefined ? data.isBanned : store.isBanned,
        bannedReason: data.bannedReason !== undefined ? data.bannedReason : store.bannedReason,
      },
    });
  }

  /**
   * Delete store as Admin
   */
  async removeAdmin(id: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return this.prisma.store.delete({
      where: { id },
    });
  }
}
