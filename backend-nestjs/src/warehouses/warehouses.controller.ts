import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WarehousesService } from './warehouses.service';

@ApiTags('Warehouses')
@Controller('warehouses')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WarehousesController {
  constructor(private readonly service: WarehousesService) {}

  @Get()
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @ApiOperation({ summary: 'Danh sách kho (kèm số sản phẩm)' })
  list() {
    return this.service.list();
  }

  @Post()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Thêm kho (tên + địa chỉ)' })
  create(@Body() body: { name?: string; address?: string }) {
    return this.service.create(body || {});
  }

  @Patch(':id')
  @Roles('ADMIN', 'STAFF')
  update(@Param('id') id: string, @Body() body: { name?: string; address?: string; isActive?: boolean }) {
    return this.service.update(id, body || {});
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get(':id/products')
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @ApiOperation({ summary: 'Sản phẩm trong kho: nhập/tồn/chuyển + lần chuyển đến/đi gần nhất' })
  products(@Param('id') id: string) {
    return this.service.products(id);
  }

  @Post('transfer')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Chuyển sản phẩm sang kho khác (đổi kho + ghi log)' })
  transfer(@Body() body: { productIds?: string[]; toWarehouseId?: string }) {
    return this.service.transfer(body || {});
  }
}
