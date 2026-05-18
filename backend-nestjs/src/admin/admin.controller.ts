import { Controller, Get, UseGuards, Query, Param, Post, Put, Body, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { GetEffectiveStoreId } from '../auth/decorators/get-effective-store-id.decorator';
import { AdminService } from './admin.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'STAFF', 'MODERATOR')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  async getDashboardStats(
    @GetUser() user: any,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
  ) {
    return this.adminService.getDashboardStats(user, effectiveStoreId);
  }

  @Get('dashboard-meta')
  @ApiOperation({ summary: 'Get layout meta (counts, status)' })
  async getDashboardMeta(
    @GetUser() user: any,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
  ) {
    return this.adminService.getDashboardMeta(user, effectiveStoreId);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Get all customers with filters' })
  async getCustomers(
    @GetUser() user: any,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('rank') rank?: string,
    @Query('includeAll') includeAll?: string,
  ) {
    return this.adminService.getCustomers(user, effectiveStoreId, {
      page,
      limit,
      search,
      rank,
      includeAll: includeAll === 'true',
    });
  }

  @Post('customers')
  @ApiOperation({ summary: 'Create customer from admin' })
  async createCustomer(@Body() dto: CreateCustomerDto) {
    return this.adminService.createCustomer(dto);
  }

  @Get('customers/:id')
  @ApiOperation({ summary: 'Get customer detail by ID' })
  async getCustomerDetail(
    @GetUser() user: any,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Param('id') id: string,
  ) {
    return this.adminService.getCustomerDetail(id, user, effectiveStoreId);
  }

  @Delete('customers/:id/soft')
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Soft delete (ban) a customer' })
  async softDeleteCustomer(
    @GetUser() user: any,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Param('id') id: string
  ) {
    return this.adminService.softDeleteCustomer(id, user, effectiveStoreId);
  }

  @Delete('customers/:id/hard')
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Hard delete a customer permanently' })
  async hardDeleteCustomer(
    @GetUser() user: any,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Param('id') id: string
  ) {
    return this.adminService.hardDeleteCustomer(id, user, effectiveStoreId);
  }

  @Get('system-config/:key')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get system config by key' })
  async getSystemConfig(@Param('key') key: string) {
    return this.adminService.getSystemConfig(key);
  }

  @Put('system-config/:key')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Upsert system config by key' })
  async upsertSystemConfig(@Param('key') key: string, @Body() data: { value: any }) {
    return this.adminService.upsertSystemConfig(key, data.value);
  }
}
