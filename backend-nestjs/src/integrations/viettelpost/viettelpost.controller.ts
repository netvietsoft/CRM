import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ViettelpostSyncService } from './viettelpost-sync.service';
import { ViettelCustomerService } from './viettel-customer.service';
import { ViettelpostAuthService } from './viettelpost-auth.service';
import { ViettelpostCodService } from './viettelpost-cod.service';

@ApiTags('ViettelPost')
@Controller('viettelpost')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ViettelpostController {
  constructor(
    private readonly viettelpostSyncService: ViettelpostSyncService,
    private readonly viettelCustomerService: ViettelCustomerService,
    private readonly authService: ViettelpostAuthService,
    private readonly codService: ViettelpostCodService,
  ) {}

  // ===== Đối soát COD (token WEB portal viettelpost.vn — admin dán thủ công) =====
  @Get('cod-token')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Trạng thái token WEB đối soát COD (hasToken/expiresAt/expired)' })
  codTokenStatus() {
    return this.codService.tokenStatus();
  }

  @Post('cod-token')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Lưu token WEB (dán từ DevTools portal viettelpost.vn)' })
  setCodToken(@Body() body: { token?: string }) {
    return this.codService.setWebToken(body?.token || '');
  }

  @Post('cod-sync')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Đồng bộ trạng thái đối soát COD ngay' })
  codSync() {
    return this.codService.syncCodStatuses();
  }

  // Cấu hình ĐVVC (read-only) cho trang Cài đặt CCM — KHÔNG lộ username/password/token.
  @Get('config')
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  config() {
    const maskPhone = (s?: string) => (s && s.length >= 4 ? s.slice(0, 2) + '***' + s.slice(-2) : s || '');
    return {
      provider: 'VIETTEL_POST',
      connected: !!(process.env.VIETTELPOST_USERNAME && process.env.VIETTELPOST_PASSWORD),
      apiUrl: process.env.VIETTELPOST_API_URL || null,
      sender: {
        name: process.env.VIETTELPOST_SENDER_NAME || '',
        phone: maskPhone(process.env.VIETTELPOST_SENDER_PHONE),
        address: process.env.VIETTELPOST_SENDER_ADDRESS || '',
        provinceId: Number(process.env.VIETTELPOST_SENDER_PROVINCE) || null,
        districtId: Number(process.env.VIETTELPOST_SENDER_DISTRICT) || null,
        wardId: Number(process.env.VIETTELPOST_SENDER_WARD) || null,
      },
    };
  }

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

  // Cập nhật trạng thái vận đơn (UpdateOrder) — TYPE: 1 Duyệt/2 Duyệt hoàn/3 Phát tiếp/4 Hủy/5 Gửi lại/11 Xóa.
  @Post('customers/:code/update-status')
  @Roles('ADMIN', 'STAFF')
  async updateStatus(@Param('code') code: string, @Body() body: { type: number; note?: string }) {
    return this.viettelCustomerService.updateStatus(decodeURIComponent(code), Number(body.type), body.note);
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
  @ApiOperation({ summary: 'List ViettelPost customers (filterable)' })
  async listCustomers(
    @Query('search') search?: string,
    @Query('productName') productName?: string,
    @Query('status') status?: string,
    @Query('codMin') codMin?: string,
    @Query('codMax') codMax?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.viettelCustomerService.listCustomers({ search, productName, status, codMin, codMax, dateFrom, dateTo });
  }

  // Danh sách trạng thái đang có (cho dropdown lọc). Đặt trước customers/:code để không bị nuốt route.
  @Get('statuses')
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  async statuses() {
    return this.viettelCustomerService.listStatuses();
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
