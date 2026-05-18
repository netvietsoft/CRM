import { Controller, Get, Post, Body, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get reviews for a product' })
  @ApiQuery({ name: 'productId', required: true })
  @ApiQuery({ name: 'rating', required: false })
  @ApiQuery({ name: 'sort', required: false, enum: ['newest', 'oldest'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getReviews(
    @Query('productId') productId: string,
    @Query('rating') rating?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const ratingNum = rating && rating !== 'all' ? parseInt(rating) : undefined;
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 10;

    return this.reviewsService.getReviews(
      productId,
      ratingNum,
      sort || 'newest',
      pageNum,
      limitNum,
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new review' })
  async createReview(@GetUser('id') userId: string, @Body() data: any) {
    return this.reviewsService.createReview(userId, data);
  }

  @Post('order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create reviews for all reviewable products in an order' })
  async createOrderReviews(@GetUser('id') userId: string, @Body() data: any) {
    return this.reviewsService.createOrderReviews(userId, data);
  }
}
