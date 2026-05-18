import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Wishlist')
@Controller('wishlist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get all wishlisted product IDs for current user' })
  async getUserWishlist(@GetUser() user: any) {
    return this.wishlistService.getUserWishlist(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Toggle wishlist (add/remove)' })
  async toggleWishlist(
    @GetUser() user: any,
    @Body() body: { productId: string },
  ) {
    return this.wishlistService.toggleWishlist(user.id, body.productId);
  }
}
