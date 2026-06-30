import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ViettelpostSyncService } from './viettelpost-sync.service';
import { ViettelCustomerService } from './viettel-customer.service';
import { ViettelpostAuthService } from './viettelpost-auth.service';

@ApiTags('ViettelPost')
@Controller('viettelpost')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ViettelpostController {
  constructor(
    private readonly viettelpostSyncService: ViettelpostSyncService,
    private readonly viettelCustomerService: ViettelCustomerService,
    private readonly authService: ViettelpostAuthService,
  ) {}

  // ===== Danh mục địa chỉ VTP (cho dropdown tạo đơn) =====
  @Get('address/provinces')
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  async provinces() {
    const r = await this.authService.get('categories/listProvince');
    return r?.data || [];
  }

  @Get('address/districts')
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  async districts(@Query('provinceId') provinceId: string) {
    const r = await this.authService.get(`categories/listDistrict?provinceId=${encodeURIComponent(provinceId)}`);
    return r?.data || [];
  }

  @Get('address/wards')
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  async wards(@Query('districtId') districtId: string) {
    const r = await this.authService.get(`categories/listWards?districtId=${encodeURIComponent(districtId)}`);
    return r?.data || [];
  }

  // Lấy danh sách dịch vụ + cước cho tuyến (getPriceAll theo ID).
  @Post('price')
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  async price(@Body() body: any) {
    const r = await this.authService.post('order/getPriceAll', {
      SENDER_PROVINCE: Number(process.env.VIETTELPOST_SENDER_PROVINCE) || 1,
      SENDER_DISTRICT: Number(process.env.VIETTELPOST_SENDER_DISTRICT) || 14,
      ...body,
      PRODUCT_TYPE: 'HH',
      NATIONAL_TYPE: 1,
    });
    return Array.isArray(r) ? r : r?.data || [];
  }

  // Tạo vận đơn mới + đẩy sang ViettelPost.
  @Post('orders')
  @Roles('ADMIN', 'STAFF')
  async createOrder(@Body() dto: any) {
    return this.viettelCustomerService.createOnVtp(dto);
  }

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

  // Chi tiết 1 khách/đơn theo mã vận đơn.
  @Get('customers/:code')
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @ApiOperation({ summary: 'Get one ViettelPost customer detail' })
  async getCustomer(@Param('code') code: string) {
    return this.viettelCustomerService.getOne(decodeURIComponent(code));
  }

  // Sửa + đẩy lên ViettelPost (order/edit). Lưu CRM luôn; đẩy VTP nếu status<200.
  @Post('customers/:code')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Edit a ViettelPost order and push to VTP' })
  async editCustomer(
    @Param('code') code: string,
    @Body()
    dto: {
      receiverFullname?: string;
      receiverPhone?: string;
      receiverAddress?: string;
      orderNote?: string;
      cod?: number;
    },
  ) {
    return this.viettelCustomerService.editAndPush(decodeURIComponent(code), dto);
  }

  // Đồng bộ ngay: gọi order/detail-v2 cho đơn chưa trạng thái cuối → enrich + cập nhật status.
  @Post('reconcile')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Run ViettelPost reconcile/enrich now' })
  async reconcileNow() {
    return this.viettelpostSyncService.reconcileOpenOrders();
  }
}
