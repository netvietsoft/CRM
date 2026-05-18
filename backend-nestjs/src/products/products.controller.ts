import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { GetEffectiveStoreId } from '../auth/decorators/get-effective-store-id.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permissions.enum';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Products')
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.PRODUCTS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  create(
    @GetUser() user: any,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.productsService.create(user.id, user.role, effectiveStoreId, createProductDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all products with filters' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  findAll(@Query() filterDto: FilterProductDto) {
    return this.productsService.findAll(filterDto);
  }

  @Get('admin')
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.PRODUCTS_VIEW)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get admin products with filters' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  findAdminProducts(
    @GetUser() user: any,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.productsService.findAdminProducts({
      userId: user.id,
      role: user.role,
      effectiveStoreId,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      categoryId,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search products' })
  search(@Query('q') query: string) {
    return this.productsService.search(query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get product by slug' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Get(':id/related')
  @Public()
  @ApiOperation({ summary: 'Get related products' })
  getRelated(@Param('id') id: string) {
    return this.productsService.getRelated(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.PRODUCTS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  update(
    @GetUser() user: any,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto, user.id, user.role, effectiveStoreId);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MODERATOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product (Admin/Owner only)' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  remove(
    @GetUser() user: any,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Param('id') id: string,
  ) {
    return this.productsService.remove(id, user.id, user.role, effectiveStoreId);
  }
}
