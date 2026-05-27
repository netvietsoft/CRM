import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(role: string, effectiveStoreId: string | null, createProductDto: CreateProductDto) {
    const {
      categoryIds,
      tagIds,
      variants,
      comboItems,
      storeId: providedStoreId,
      ...productData
    } = createProductDto;

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

    await this.validateProductRelations({
      categoryIds,
      tagIds,
      supplierId: productData.supplierId,
      materialId: productData.materialId,
      unitId: productData.unitId,
      comboItems,
    });

    // Generate slug from name
    const slug = this.generateSlug(productData.name);

    const product = await this.prisma.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
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
      });

      if (variants && variants.length > 0) {
        await this.createVariants(tx, createdProduct.id, variants);
      }

      if (tagIds && tagIds.length > 0) {
        await tx.productTagMap.createMany({
          data: tagIds.map((tagId) => ({
            productId: createdProduct.id,
            tagId,
          })),
        });
      }

      if (comboItems && comboItems.length > 0) {
        await tx.productComboItem.createMany({
          data: comboItems.map((item) => ({
            comboProductId: createdProduct.id,
            childProductId: item.childProductId,
            quantity: item.quantity || 1,
          })),
        });
      }

      return createdProduct;
    });

    return this.findOne(product.id);
  }

  async findAdminProducts(params: {
    effectiveStoreId: string | null;
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    supplierId?: string;
    materialId?: string;
    unitId?: string;
    tagId?: string;
    sortBy?: string;
    sortOrder?: string;
    isActive?: boolean;
  }) {
    const { effectiveStoreId } = params;
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

    if (params.supplierId) {
      where.supplierId = params.supplierId;
    }

    if (params.materialId) {
      where.materialId = params.materialId;
    }

    if (params.unitId) {
      where.unitId = params.unitId;
    }

    if (params.tagId) {
      where.tagMaps = {
        some: { tagId: params.tagId },
      };
    }

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';
    let orderBy: any = { createdAt: 'desc' };

    if (params.sortBy === 'name') {
      orderBy = { name: sortOrder };
    } else if (params.sortBy === 'price') {
      orderBy = [{ salePrice: sortOrder }, { originalPrice: sortOrder }];
    } else if (params.sortBy === 'stock') {
      orderBy = { stockQuantity: sortOrder };
    } else if (params.sortBy === 'sold') {
      orderBy = { orderItems: { _count: sortOrder } };
    } else if (params.sortBy === 'status') {
      orderBy = { isActive: sortOrder };
    }

    const [products, total, activeCount, totalStockAggregate, lowStockCount] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          categories: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true, code: true } },
          material: { select: { id: true, name: true, code: true } },
          unit: { select: { id: true, name: true, code: true } },
          tagMaps: {
            include: {
              tag: true,
            },
          },
          comboItems: {
            include: {
              childProduct: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
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
      this.prisma.product.count({
        where: {
          ...where,
          isActive: true,
        },
      }),
      this.prisma.product.aggregate({
        where,
        _sum: {
          stockQuantity: true,
        },
      }),
      this.prisma.product.count({
        where: {
          ...where,
          isActive: true,
          stockQuantity: {
            lt: 10,
          },
        },
      }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        total,
        activeCount,
        totalStock: totalStockAggregate._sum.stockQuantity ?? 0,
        lowStockCount,
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
          supplier: { select: { id: true, name: true, code: true } },
          material: { select: { id: true, name: true, code: true } },
          unit: { select: { id: true, name: true, code: true } },
          tagMaps: {
            include: {
              tag: true,
            },
          },
          comboItems: {
            include: {
              childProduct: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
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
        supplier: true,
        material: true,
        unit: true,
        tagMaps: {
          include: {
            tag: true,
          },
        },
        comboItems: {
          include: {
            childProduct: {
              select: {
                id: true,
                name: true,
                sku: true,
                imageUrl: true,
              },
            },
          },
        },
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
    const avgRating =
      product.reviews.length > 0
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
        supplier: true,
        material: true,
        unit: true,
        tagMaps: {
          include: {
            tag: true,
          },
        },
        comboItems: {
          include: {
            childProduct: {
              select: {
                id: true,
                name: true,
                sku: true,
                imageUrl: true,
              },
            },
          },
        },
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
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
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
        OR: [{ storeId: null }, { store: { isActive: true, isBanned: false } }],
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

    const excludeIds = [productId, ...relatedByCategory.map((p) => p.id)];
    const additionalProducts = await this.prisma.product.findMany({
      where: {
        isActive: true,
        id: { notIn: excludeIds },
        OR: [{ storeId: null }, { store: { isActive: true, isBanned: false } }],
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
    void userId;
    const { categoryIds, tagIds, variants, comboItems, ...productData } = updateProductDto;

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

    await this.validateProductRelations({
      categoryIds,
      tagIds,
      supplierId: productData.supplierId,
      materialId: productData.materialId,
      unitId: productData.unitId,
      comboItems,
      currentProductId: id,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          ...productData,
          categories: categoryIds
            ? {
                set: categoryIds.map((categoryId) => ({ id: categoryId })),
              }
            : undefined,
        },
      });

      if (variants) {
        await tx.productVariant.deleteMany({
          where: { productId: id },
        });

        if (variants.length > 0) {
          await this.createVariants(tx, id, variants);
        }
      }

      if (tagIds !== undefined) {
        await tx.productTagMap.deleteMany({
          where: { productId: id },
        });

        if (tagIds.length > 0) {
          await tx.productTagMap.createMany({
            data: tagIds.map((tagId) => ({
              productId: id,
              tagId,
            })),
          });
        }
      }

      if (comboItems !== undefined) {
        await tx.productComboItem.deleteMany({
          where: { comboProductId: id },
        });

        if (comboItems.length > 0) {
          await tx.productComboItem.createMany({
            data: comboItems.map((item) => ({
              comboProductId: id,
              childProductId: item.childProductId,
              quantity: item.quantity || 1,
            })),
          });
        }
      }
    });

    return this.findOne(id);
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
      // Delete combo relations
      await tx.productComboItem.deleteMany({
        where: {
          OR: [{ comboProductId: id }, { childProductId: id }],
        },
      });
      // Delete product tags
      await tx.productTagMap.deleteMany({ where: { productId: id } });
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

  private async createVariants(tx: PrismaService | any, productId: string, variants: any[]) {
    const variantData = variants.map((v) => ({
      productId,
      sizeId: v.sizeId,
      colorId: v.colorId,
      price: v.price,
      stock: v.stock || 0,
    }));

    await tx.productVariant.createMany({
      data: variantData,
    });
  }

  private async validateProductRelations(params: {
    categoryIds?: string[];
    tagIds?: string[];
    supplierId?: string;
    materialId?: string;
    unitId?: string;
    comboItems?: Array<{ childProductId: string; quantity?: number }>;
    currentProductId?: string;
  }) {
    const { categoryIds, tagIds, supplierId, materialId, unitId, comboItems, currentProductId } =
      params;

    if (categoryIds?.length) {
      const count = await this.prisma.category.count({
        where: { id: { in: categoryIds } },
      });
      if (count !== new Set(categoryIds).size) {
        throw new BadRequestException('Có danh mục không tồn tại');
      }
    }

    if (tagIds?.length) {
      const count = await this.prisma.productTag.count({
        where: { id: { in: tagIds } },
      });
      if (count !== new Set(tagIds).size) {
        throw new BadRequestException('Có tag sản phẩm không tồn tại');
      }
    }

    if (supplierId) {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: supplierId },
      });
      if (!supplier) {
        throw new BadRequestException('Nhà cung cấp không tồn tại');
      }
    }

    if (materialId) {
      const material = await this.prisma.material.findUnique({
        where: { id: materialId },
      });
      if (!material) {
        throw new BadRequestException('Chất liệu không tồn tại');
      }
    }

    if (unitId) {
      const unit = await this.prisma.unit.findUnique({
        where: { id: unitId },
      });
      if (!unit) {
        throw new BadRequestException('Đơn vị tính không tồn tại');
      }
    }

    if (comboItems?.length) {
      const childIds = comboItems.map((item) => item.childProductId);
      if (new Set(childIds).size !== childIds.length) {
        throw new BadRequestException('Sản phẩm con trong combo bị trùng');
      }
      if (currentProductId && childIds.includes(currentProductId)) {
        throw new BadRequestException('Combo không thể chứa chính nó');
      }
      const count = await this.prisma.product.count({
        where: { id: { in: childIds } },
      });
      if (count !== childIds.length) {
        throw new BadRequestException('Có sản phẩm con trong combo không tồn tại');
      }
    }
  }

  private generateSlug(name: string): string {
    return (
      name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') +
      '-' +
      Date.now().toString(36)
    );
  }
}
