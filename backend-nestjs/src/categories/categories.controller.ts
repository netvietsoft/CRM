import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permissions.enum';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { GetEffectiveStoreId } from '../auth/decorators/get-effective-store-id.decorator';

@ApiTags('Categories')
@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all categories' })
  findAll(@Query('admin') admin?: string, @Query('storeId') storeId?: string) {
    return this.categoriesService.findAll(admin === 'true', storeId);
  }

  @Post()
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.CATEGORIES_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new category' })
  create(
    @Body() data: any,
    @GetUser() user: any,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
  ) {
    return this.categoriesService.create(data, user, effectiveStoreId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get category by ID' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.CATEGORIES_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category' })
  update(
    @Param('id') id: string,
    @Body() data: any,
    @GetUser() user: any,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
  ) {
    return this.categoriesService.update(id, data, user, effectiveStoreId);
  }

  @Delete(':id')
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.CATEGORIES_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete category' })
  remove(
    @Param('id') id: string,
    @GetUser() user: any,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
  ) {
    return this.categoriesService.remove(id, user, effectiveStoreId);
  }
}
