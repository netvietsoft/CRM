import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ViettelpostSyncService } from './viettelpost-sync.service';

@ApiTags('ViettelPost')
@Controller('viettelpost')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ViettelpostController {
  constructor(private readonly viettelpostSyncService: ViettelpostSyncService) {}

  // Đơn đã tải về từ ViettelPost (source='VIETTEL') — cho trang admin xem bảng.
  @Get('orders')
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @ApiOperation({ summary: 'List orders pulled from ViettelPost webhook' })
  async listPulledOrders() {
    return this.viettelpostSyncService.listPulledOrders();
  }
}
