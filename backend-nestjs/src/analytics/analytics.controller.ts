import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetEffectiveStoreId } from '../auth/decorators/get-effective-store-id.decorator';
import { AnalyticsService } from './analytics.service';
import { UpsertAdMapDto } from './dto/upsert-ad-map.dto';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('product-pnl')
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Lãi/lỗ theo sản phẩm (đơn COD đã thu + spend Meta đã map)' })
  productPnl(
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('platform') platform?: string,
    @Query('source') source?: string,
  ) {
    return this.analytics.productPnl(effectiveStoreId, from, to, platform || 'META', source);
  }

  @Get('ad-map')
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'DS campaign + sản phẩm đã gán (cho màn gán)' })
  listAdMap(
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Query('platform') platform?: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.analytics.listAdMap(effectiveStoreId, platform || 'META', accountId);
  }

  @Put('ad-map')
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Gán/gỡ campaign -> sản phẩm (productId=null để gỡ)' })
  upsertAdMap(
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Body() dto: UpsertAdMapDto,
  ) {
    return this.analytics.upsertAdMap(effectiveStoreId, dto);
  }
}
