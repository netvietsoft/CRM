import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all wishlisted product IDs for a user
   */
  async getUserWishlist(userId: string) {
    const wishlists = await this.prisma.wishlist.findMany({
      where: { userId },
      select: { productId: true },
    });

    return {
      productIds: wishlists.map((w) => w.productId),
    };
  }

  /**
   * Toggle wishlist (add/remove)
   */
  async toggleWishlist(userId: string, productId: string) {
    if (!productId) {
      throw new Error('productId is required');
    }

    // Check if already wishlisted
    const existing = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existing) {
      // Remove from wishlist
      await this.prisma.wishlist.delete({ where: { id: existing.id } });
      return { action: 'removed', productId };
    } else {
      // Add to wishlist
      await this.prisma.wishlist.create({
        data: {
          userId,
          productId,
        },
      });
      return { action: 'added', productId };
    }
  }
}
