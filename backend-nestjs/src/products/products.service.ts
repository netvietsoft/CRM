import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, role: string, effectiveStoreId: string | null, createProductDto: CreateProductDto) {
    const { categoryIds, variants, storeId: providedStoreId, ...productData } = createProductDto;

    let storeId: string | undefined;
    
    if (role !== 'ADMIN') {
      // Non-admin roles (MODERATOR, STAFF) MUST use their effectiveStoreId
      if (!effectiveStoreId) {
        throw new BadRequestException('User has no assigned store');
      }
      storeId = effectiveStoreId;
    } else {
      // ADMIN: use provided storeId or find default store
      if (providedStoreId) {
        // Validate store exists
        const store = await this.prisma.store.findUnique({
          where: { id: providedStoreId },
        });
        if (!store) {
          throw new NotFoundException('Store not found');
        }
        storeId = providedStoreId;
      } else {
        // Find default admin store or first active store
        const defaultStore = await this.prisma.store.findFirst({
          where: {
            OR: [
              { name: { contains: 'Admin' } },
              { name: { contains: 'Hệ thống' } },
              { isActive: true },
            ],
          },
          orderBy: { createdAt: 'asc' },
        });
        
        if (defaultStore) {
          storeId = defaultStore.id;
        }
      }
    }

    // Generate slug from name
    const slug = this.generateSlug(productData.name);

    const product = await this.prisma.product.create({
      data: {
        ...productData,
        slug,
        storeId,
        categories: categoryIds
          ? {
              connect: categoryIds.map((id) => ({ id })),
            }
          : undefined,
      },
      include: {
        categories: true,
        variants: {
          include: {
            size: true,
            color: true,
          },
        },
      },
    });

    // Create variants if provided
    if (variants && variants.length > 0) {
      await this.createVariants(product.id, variants);
    }

    return product;
  }

  async findAdminProducts(params: {
    userId: string;
    role: string;
    effectiveStoreId: string | null;
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    isActive?: boolean;
  }) {
    const { userId, role, effectiveStoreId } = params;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (effectiveStoreId) {
      where.storeId = effectiveStoreId;
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { description: { contains: params.search } },
        { sku: { contains: params.search } },
      ];
    }

    if (params.categoryId) {
      where.categories = {
        some: { id: params.categoryId },
      };
    }

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          categories: { select: { id: true, name: true } },
          variants: {
            include: {
              size: true,
              color: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: { select: { orderItems: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAll(filterDto: FilterProductDto) {
    const {
      page = 1,
      limit = 20,
      search,
      storeSlug,
      categoryId,
      minPrice,
      maxPrice,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filterDto;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { sku: { contains: search } },
      ];
    }

    if (storeSlug) {
      where.store = { slug: storeSlug };
    }

    if (categoryId) {
      where.categories = {
        some: { id: categoryId },
      };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.salePrice = {};
      if (minPrice !== undefined) where.salePrice.gte = minPrice;
      if (maxPrice !== undefined) where.salePrice.lte = maxPrice;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          categories: true,
          variants: {
            include: {
              size: true,
              color: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
              addressProvince: true,
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        categories: true,
        variants: {
          include: {
            size: true,
            color: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Calculate average rating
    const avgRating = product.reviews.length > 0
      ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
      : 0;

    return {
      ...product,
      avgRating: Math.round(avgRating * 10) / 10,
      reviewCount: product.reviews.length,
    };
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        categories: { select: { id: true, name: true } },
        variants: {
          include: {
            size: true,
            color: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            isActive: true,
            isBanned: true,
          },
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Calculate average rating
    const avgRating =
      product.reviews.length > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) /
          product.reviews.length
        : 0;

    return {
      ...product,
      avgRating: Math.round(avgRating * 10) / 10,
      reviewCount: product.reviews.length,
    };
  }

  async getRelated(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { categories: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const categoryIds = product.categories.map((c) => c.id);

    const relatedByCategory = await this.prisma.product.findMany({
      where: {
        isActive: true,
        id: { not: productId },
        categories: {
          some: { id: { in: categoryIds } },
        },
        OR: [
          { storeId: null },
          { store: { isActive: true, isBanned: false } },
        ],
      },
      take: 10,
      include: {
        categories: { select: { name: true } },
        variants: { include: { size: true, color: true } },
        store: { select: { id: true, name: true, slug: true, logoUrl: true } },
      },
    });

    if (relatedByCategory.length >= 10) {
      return relatedByCategory;
    }

    const excludeIds = [productId, ...relatedByCategory.map(p => p.id)];
    const additionalProducts = await this.prisma.product.findMany({
      where: {
        isActive: true,
        id: { notIn: excludeIds },
        OR: [
          { storeId: null },
          { store: { isActive: true, isBanned: false } },
        ],
      },
      take: 10 - relatedByCategory.length,
      include: {
        categories: { select: { name: true } },
        variants: { include: { size: true, color: true } },
        store: { select: { id: true, name: true, slug: true, logoUrl: true } },
      },
    });

    return [...relatedByCategory, ...additionalProducts];
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    userId: string,
    role: string,
    effectiveStoreId: string | null,
  ) {
    const { categoryIds, variants, ...productData } = updateProductDto;

    // Check if product exists and if user has access
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new NotFoundException('Product not found');
    }

    if (role !== 'ADMIN' && effectiveStoreId && existingProduct.storeId !== effectiveStoreId) {
      throw new BadRequestException('You do not have permission to update this product');
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        categories: categoryIds
          ? {
              set: categoryIds.map((id) => ({ id })),
            }
          : undefined,
      },
      include: {
        categories: true,
        variants: {
          include: {
            size: true,
            color: true,
          },
        },
      },
    });

    // Update variants if provided
    if (variants) {
      // Delete existing variants
      await this.prisma.productVariant.deleteMany({
        where: { productId: id },
      });

      // Create new variants
      if (variants.length > 0) {
        await this.createVariants(id, variants);
      }
    }

    return product;
  }

  async remove(id: string, userId: string, role: string, effectiveStoreId: string | null) {
    // Check if product exists and if user has access
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new NotFoundException('Product not found');
    }

    if (role !== 'ADMIN' && effectiveStoreId && existingProduct.storeId !== effectiveStoreId) {
      throw new BadRequestException('You do not have permission to delete this product');
    }

    // Hard delete: remove related records then the product
    await this.prisma.$transaction(async (tx) => {
      // Delete variants
      await tx.productVariant.deleteMany({ where: { productId: id } });
      // Delete reviews
      await tx.review.deleteMany({ where: { productId: id } });
      // Delete wishlists
      await tx.wishlist.deleteMany({ where: { productId: id } });
      // Delete cart items referencing this product
      await tx.cartItem.deleteMany({ where: { productId: id } });
      // Delete order items referencing this product
      await tx.orderItem.deleteMany({ where: { productId: id } });
      // Disconnect categories (implicit many-to-many, handled by Prisma on delete)
      // Delete the product (Prisma auto-cleans the implicit join table)
      await tx.product.delete({ where: { id } });
    });

    return { success: true, message: 'Sản phẩm đã được xóa vĩnh viễn' };
  }

  async search(query: string) {
    return this.prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
          { sku: { contains: query } },
        ],
        isActive: true,
      },
      take: 10,
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        salePrice: true,
        originalPrice: true,
        sku: true,
      },
    });
  }

  private async createVariants(productId: string, variants: any[]) {
    const variantData = variants.map((v) => ({
      productId,
      sizeId: v.sizeId,
      colorId: v.colorId,
      price: v.price,
      stock: v.stock || 0,
    }));

    await this.prisma.productVariant.createMany({
      data: variantData,
    });
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      + '-' + Date.now().toString(36);
  }
}
