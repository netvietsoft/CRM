import { Injectable, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get reviews for a product with filters and pagination
   */
  async getReviews(
    productId: string,
    rating?: number,
    sort: string = 'newest',
    page: number = 1,
    limit: number = 10,
  ) {
    if (!productId) {
      throw new BadRequestException('Product ID is required');
    }

    // Build where clause
    const where: any = { productId };
    if (rating && rating !== 0) {
      where.rating = rating;
    }

    // Build orderBy clause
    const orderBy: any = sort === 'oldest' 
      ? { createdAt: 'asc' } 
      : { createdAt: 'desc' };

    // Get reviews with pagination
    const [reviews, totalCount, stats] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              name: true,
              avatarUrl: true,
            },
          },
          product: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.review.count({ where }),
      // Get statistics
      this.prisma.review.groupBy({
        by: ['rating'],
        where: { productId },
        _count: { rating: true },
      }),
    ]);

    // Calculate average rating and distribution
    const totalReviews = await this.prisma.review.count({ where: { productId } });
    const avgRating = totalReviews > 0
      ? await this.prisma.review.aggregate({
          where: { productId },
          _avg: { rating: true },
        })
      : { _avg: { rating: 0 } };

    const distribution = [1, 2, 3, 4, 5].map(star => {
      const found = stats.find(s => s.rating === star);
      return {
        rating: star,
        count: found ? found._count.rating : 0,
      };
    });

    // Get all images from reviews
    const allReviews = await this.prisma.review.findMany({
      where: { productId },
      select: { images: true },
    });
    
    const allImages: string[] = [];
    allReviews.forEach(review => {
      if (review.images && Array.isArray(review.images)) {
        allImages.push(...(review.images as string[]));
      }
    });

    return {
      reviews,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      statistics: {
        averageRating: avgRating._avg.rating ? Number(avgRating._avg.rating.toFixed(1)) : 0,
        totalReviews,
        distribution,
      },
      allImages: allImages.slice(0, 20), // Limit to 20 images for gallery
    };
  }

  /**
   * Create a new review
   */
  async createReview(userId: string, data: any) {
    const { productId, orderId, rating, comment, images, size, color } = data;

    // Validate required fields
    if (!productId || !rating) {
      throw new BadRequestException('Product ID and rating are required');
    }

    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Check if user has completed order with this product
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId: userId,
        status: 'COMPLETED',
        items: {
          some: {
            productId,
          },
        },
      },
    });

    if (!order) {
      throw new ForbiddenException('Bạn chỉ có thể đánh giá sản phẩm sau khi hoàn thành đơn hàng');
    }

    // Check if review already exists for this user, product, and order
    const existingReview = await this.prisma.review.findFirst({
      where: {
        userId: userId,
        productId,
        orderId,
      },
    });

    if (existingReview) {
      throw new ConflictException('Bạn đã đánh giá sản phẩm này trong đơn hàng này');
    }

    // Validate images
    if (images && Array.isArray(images) && images.length > 5) {
      throw new BadRequestException('Tối đa 5 ảnh');
    }

    // Create review
    const review = await this.prisma.review.create({
      data: {
        userId: userId,
        productId,
        orderId,
        rating,
        comment: comment || null,
        images: images || null,
        size: size || null,
        color: color || null,
        isVerifiedPurchase: true,
      },
      include: {
        user: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return review;
  }

  async createOrderReviews(userId: string, data: any) {
    const { orderId, rating, comment, images } = data;

    if (!orderId || !rating) {
      throw new BadRequestException('Order ID and rating are required');
    }

    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    if (images && Array.isArray(images) && images.length > 5) {
      throw new BadRequestException('Tối đa 5 ảnh');
    }

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
        status: 'COMPLETED',
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new ForbiddenException('Bạn chỉ có thể đánh giá sau khi đơn hàng hoàn thành');
    }

    const reviewableItems = order.items.filter((item) => !item.isGift && item.productId);
    if (reviewableItems.length === 0) {
      throw new BadRequestException('Không có sản phẩm để đánh giá');
    }

    const existingReviews = await this.prisma.review.findMany({
      where: {
        userId,
        orderId,
      },
      select: {
        productId: true,
      },
    });

    const reviewedProductIds = new Set(existingReviews.map((review) => review.productId));
    const pendingItems = reviewableItems.filter((item) => !reviewedProductIds.has(item.productId));

    if (pendingItems.length === 0) {
      throw new ConflictException('Bạn đã đánh giá đơn hàng này rồi');
    }

    const trimmedComment = typeof comment === 'string' ? comment.trim() : '';

    return this.prisma.$transaction(async (tx) => {
      const createdReviews = await Promise.all(
        pendingItems.map((item) =>
          tx.review.create({
            data: {
              userId,
              productId: item.productId,
              orderId,
              rating,
              comment: trimmedComment || null,
              images: images || null,
              size: item.size || null,
              color: item.color || null,
              isVerifiedPurchase: true,
            },
            include: {
              user: {
                select: {
                  name: true,
                  avatarUrl: true,
                },
              },
            },
          }),
        ),
      );

      const currentMetadata =
        order.metadata && typeof order.metadata === 'object' && !Array.isArray(order.metadata)
          ? (order.metadata as Record<string, any>)
          : {};

      let rewardGranted = false;
      if (trimmedComment && !currentMetadata.reviewRewardGranted) {
        await tx.user.update({
          where: { id: userId },
          data: {
            spinTurns: { increment: 1 },
          },
        });

        await tx.order.update({
          where: { id: orderId },
          data: {
            metadata: {
              ...currentMetadata,
              reviewRewardGranted: true,
              reviewRewardGrantedAt: new Date().toISOString(),
            },
          },
        });

        rewardGranted = true;
      }

      return {
        success: true,
        reviews: createdReviews,
        rewardGranted,
        reward: rewardGranted
          ? {
              spinTurnsAdded: 1,
              message: 'Bạn nhận được 1 lượt quay thưởng vì đã đánh giá kèm mô tả.',
            }
          : null,
      };
    });
  }
}
