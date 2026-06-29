import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ViettelpostSyncService } from './viettelpost-sync.service';
import { ViettelCustomerService } from './viettel-customer.service';

@ApiTags('ViettelPost')
@Controller('viettelpost')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ViettelpostController {
  constructor(
    private readonly viettelpostSyncService: ViettelpostSyncService,
    private readonly viettelCustomerService: ViettelCustomerService,
  ) {}

  // Đơn đã tải về từ ViettelPost (source='VIETTEL') — cho trang admin xem bảng.
  @Get('orders')
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @ApiOperation({ summary: 'List orders pulled from ViettelPost webhook' })
  async listPulledOrders() {
    return this.viettelpostSyncService.listPulledOrders();
  }

  // Bảng "Khách hàng Viettel" — toàn bộ field VTP, 1 dòng / mã vận đơn.
  @Get('customers')
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @ApiOperation({ summary: 'List ViettelPost customers (full captured fields)' })
  async listCustomers() {
    return this.viettelCustomerService.listCustomers();
  }

  // Đồng bộ ngay: gọi order/detail-v2 cho đơn chưa trạng thái cuối → enrich + cập nhật status.
  @Post('reconcile')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Run ViettelPost reconcile/enrich now' })
  async reconcileNow() {
    return this.viettelpostSyncService.reconcileOpenOrders();
  }
}
