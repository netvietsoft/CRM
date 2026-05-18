import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: any, effectiveStoreId: string | null, storeId?: string) {
    let targetStoreId = storeId;
    if (effectiveStoreId) {
      targetStoreId = effectiveStoreId;
    } else if (!storeId) {
      // For ADMIN fetching without specific storeId, only get global integrations
      // Global integrations are attached to a store owned by an ADMIN
      const globalStore = await this.prisma.store.findFirst({
        where: { owner: { role: 'ADMIN' } },
        select: { id: true }
      });
      targetStoreId = globalStore?.id || 'no-global-store';
    }

    return this.prisma.storeIntegration.findMany({
      where: {
        ...(targetStoreId && { storeId: targetStoreId }),
      },
      include: {
        store: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        platform: 'asc',
      },
    });
  }

  async upsert(user: any, effectiveStoreId: string | null, data: any) {
    const { platform, storeId, ...config } = data;

    let targetStoreId = storeId;

    if (user.role !== 'ADMIN') {
      if (!effectiveStoreId) {
        throw new UnauthorizedException('User has no assigned store.');
      }
      targetStoreId = effectiveStoreId;
    }

    if (targetStoreId) {
      // Store-specific integration
      return this.prisma.storeIntegration.upsert({
        where: {
          storeId_platform: {
            storeId: targetStoreId,
            platform,
          },
        },
        update: {
          ...config,
        },
        create: {
          storeId: targetStoreId,
          platform,
          ...config,
        },
      });
    } else {
      // Global integration - find or create a default store for Admin
      let defaultStore = await this.prisma.store.findFirst({
        where: { owner: { role: 'ADMIN' } },
        select: { id: true },
      });
      
      // If no admin store exists, create a default one
      if (!defaultStore) {
        // Get the first admin user
        const adminUser = await this.prisma.user.findFirst({
          where: { role: 'ADMIN' },
          select: { id: true },
        });
        
        if (!adminUser) {
          throw new Error('No admin user found. Cannot create default store.');
        }
        
        defaultStore = await this.prisma.store.create({
          data: {
            name: 'Hệ thống Admin',
            slug: 'admin-global-store',
            ownerId: adminUser.id,
            isActive: true,
          },
          select: { id: true },
        });
      }

      return this.prisma.storeIntegration.upsert({
        where: {
          storeId_platform: {
            storeId: defaultStore.id,
            platform,
          },
        },
        update: {
          ...config,
        },
        create: {
          storeId: defaultStore.id,
          platform,
          ...config,
        },
      });
    }
  }
}
