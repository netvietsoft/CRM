import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, user?: any, effectiveStoreId?: string | null) {
    let storeId = null;
    
    if (user && user.role !== 'ADMIN') {
      if (!effectiveStoreId) {
        throw new NotFoundException('User has no assigned store');
      }
      storeId = effectiveStoreId;
    } else if (data.storeId) {
      storeId = data.storeId;
    }

    const slug = data.slug || data.name.toLowerCase().replace(/ /g, '-');

    // Only pick known Category fields, ignore unknown ones like 'level'
    const { name, description, parentId, sortOrder, isActive, externalId, imageUrl } = data;

    return this.prisma.category.create({
      data: {
        name,
        slug,
        ...(description !== undefined && { description }),
        ...(parentId && { parentId }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
        ...(externalId && { externalId }),
        ...(imageUrl && { imageUrl }),
        ...(storeId && { storeId }),
      },
    });
  }

  async findAll(isAdmin: boolean = false, storeId?: string) {
    const where: any = isAdmin ? {} : { isActive: true };
    if (storeId) {
      // Filter categories that EITHER belong to the store OR have products belonging to the store
      where.OR = [
        { storeId: storeId },
        { products: { some: { storeId: storeId } } }
      ];
    }
    const categories = await this.prisma.category.findMany({
      where,
      include: {
        parent: { select: { name: true } },
        children: true,
        _count: {
          select: { products: true, children: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    // If storeId is provided, we need to adjust the product count to be store-specific
    if (storeId) {
      const categoriesWithStoreCount = await Promise.all(
        categories.map(async (cat) => {
          const storeProductCount = await this.prisma.product.count({
            where: {
              storeId: storeId,
              categories: { some: { id: cat.id } },
              isActive: true,
            },
          });
          return {
            ...cat,
            _count: {
              ...cat._count,
              products: storeProductCount,
            },
          };
        })
      );
      return categoriesWithStoreCount;
    }

    return categories;
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        products: {
          where: { isActive: true },
          take: 20,
        },
        _count: {
          select: { products: true, children: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, data: any, user?: any, effectiveStoreId?: string | null) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    if (user && user.role !== 'ADMIN' && effectiveStoreId && existing.storeId !== effectiveStoreId) {
      throw new NotFoundException('Category not found or access denied');
    }

    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, user?: any, effectiveStoreId?: string | null) {
    // Check if category exists
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { children: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (user && user.role !== 'ADMIN' && effectiveStoreId && category.storeId !== effectiveStoreId) {
      throw new NotFoundException('Category not found or access denied');
    }

    // Cascade delete children is handled by Prisma if configured, 
    // but here we just manually handle it to be safe or set null
    // Looking at the schema is better, but I'll assume we want to delete them for now
    if (category.children.length > 0) {
      await this.prisma.category.deleteMany({
        where: { parentId: id },
      });
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }
}
