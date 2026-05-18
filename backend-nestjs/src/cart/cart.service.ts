import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                variants: {
                  include: {
                    size: true,
                    color: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  variants: {
                    include: {
                      size: true,
                      color: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    // Calculate totals
    const subtotal = cart.items.reduce((sum, item) => {
      let price = item.product.salePrice || item.product.originalPrice;
      if (item.product.variants && item.product.variants.length > 0) {
        let variant = null;
        if (item.size && item.color) {
          variant = item.product.variants.find(
            (v: any) => v.size?.name === item.size && v.color?.name === item.color
          );
        } else if (item.size) {
          variant = item.product.variants.find(
            (v: any) => v.size?.name === item.size
          );
        } else if (item.color) {
          variant = item.product.variants.find(
            (v: any) => v.color?.name === item.color
          );
        }
        if (variant && variant.price) {
          price = variant.price;
        }
      }
      return sum + price * item.quantity;
    }, 0);

    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      ...cart,
      subtotal,
      totalItems,
    };
  }

  async addToCart(userId: string, addToCartDto: AddToCartDto) {
    const { productId, quantity, size, color } = addToCartDto;

    // Check if product exists and check stock
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Sản phẩm không có sẵn');
    }

    // Stock check removed to allow ordering out of stock items

    // Get or create cart for user
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
    }

    // Find existing item with the SAME productId, size, and color
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        size: size || null,
        color: color || null,
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      // Stock check removed to allow ordering out of stock items

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
          size: size || null,
          color: color || null,
        },
      });
    }

    return { success: true, message: 'Đã thêm vào giỏ hàng' };
  }

  async updateCartItem(userId: string, itemId: string, updateDto: UpdateCartItemDto) {
    const { quantity } = updateDto;

    // Find cart item
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
        product: true,
      },
    });

    if (!cartItem || cartItem.cart.userId !== userId) {
      throw new NotFoundException('Cart item not found');
    }

    // Stock check removed to allow ordering out of stock items

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    return { success: true, message: 'Đã cập nhật giỏ hàng' };
  }

  async removeCartItem(userId: string, itemId: string) {
    // Find cart item
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
      },
    });

    if (!cartItem || cartItem.cart.userId !== userId) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    return { success: true, message: 'Đã xóa khỏi giỏ hàng' };
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (cart) {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    return { success: true, message: 'Đã xóa toàn bộ giỏ hàng' };
  }
}
