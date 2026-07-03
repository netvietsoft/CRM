import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateOrderSourceDto } from './dto/create-order-source.dto';
import { UpdateOrderSourceDto } from './dto/update-order-source.dto';
import { OrderSourcesService } from './order-sources.service';

@ApiTags('Order Sources')
@Controller('order-sources')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STAFF', 'MODERATOR')
@ApiBearerAuth()
export class OrderSourcesController {
  constructor(private readonly orderSourcesService: OrderSourcesService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách nguồn đơn' })
  async findAll(@Query('activeOnly') activeOnly?: string) {
    return this.orderSourcesService.findAll(activeOnly === 'true');
  }

  @Post()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Tạo nguồn đơn' })
  async create(@Body() dto: CreateOrderSourceDto) {
    return this.orderSourcesService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Cập nhật nguồn đơn' })
  async update(@Param('id') id: string, @Body() dto: UpdateOrderSourceDto) {
    return this.orderSourcesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Xóa nguồn đơn' })
  async remove(@Param('id') id: string) {
    return this.orderSourcesService.remove(id);
  }
}
