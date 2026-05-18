import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StoresService } from './stores.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Stores')
@Controller('stores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all active stores' })
  async getAllStores() {
    return this.storesService.getAllStores();
  }

  @Get('admin')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all stores for Admin' })
  async getAllAdmin() {
    return this.storesService.findAllAdmin();
  }

  @Get('admin/:id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get store detail for Admin' })
  async getAdminStoreDetail(@Param('id') id: string) {
    return this.storesService.findAdminStoreDetail(id);
  }

  @Post('admin')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create store as Admin' })
  async createStoreAdmin(@GetUser('id') adminId: string, @Body() data: any) {
    return this.storesService.createStoreAdmin(adminId, data);
  }

  @Post('admin/:id/approve')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a store' })
  async approveStore(@Param('id') id: string) {
    return this.storesService.approveStore(id);
  }

  @Patch('admin/:id/status')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update store status (isActive, isBanned)' })
  async updateStatus(@Param('id') id: string, @Body() data: any) {
    return this.storesService.updateStatus(id, data);
  }

  @Delete('admin/:id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a store (Admin only)' })
  async removeAdmin(@Param('id') id: string) {
    return this.storesService.removeAdmin(id);
  }

  @Get('my-store')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user store' })
  async getUserStore(@GetUser('id') userId: string) {
    return this.storesService.getUserStore(userId);
  }

  @Get('public/:slug')
  @Public()
  @ApiOperation({ summary: 'Get public store by slug' })
  async getPublicStoreBySlug(@Param('slug') slug: string) {
    return this.storesService.getPublicStoreBySlug(slug);
  }

  @Get('public/:slug/reviews')
  @Public()
  @ApiOperation({ summary: 'Get store reviews by slug' })
  async getPublicStoreReviews(@Param('slug') slug: string) {
    return this.storesService.getPublicStoreReviews(slug);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get store by ID' })
  async getStoreById(@Param('id') id: string) {
    return this.storesService.getStoreById(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new store' })
  async createStore(@GetUser('id') userId: string, @Body() data: any) {
    return this.storesService.createStore(userId, data);
  }

  @Put()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user store' })
  async updateStore(@GetUser('id') userId: string, @Body() data: any) {
    return this.storesService.updateStore(userId, data);
  }
}
