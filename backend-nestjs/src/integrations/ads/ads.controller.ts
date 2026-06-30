import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { Permission } from '../../auth/enums/permissions.enum';
import { GetEffectiveStoreId } from '../../auth/decorators/get-effective-store-id.decorator';
import { AdsSyncService } from './ads-sync.service';
import { AdsService } from './ads.service';

@ApiTags('Ads')
@Controller('ads')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class AdsController {
  constructor(
    private readonly syncService: AdsSyncService,
    private readonly adsService: AdsService,
  ) {}

  @Post('sync')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.INTEGRATIONS_MANAGE)
  @ApiOperation({ summary: 'Đồng bộ dữ liệu Meta Ads (nền nếu có Redis; mặc định 90 ngày)' })
  async syncNow(
    @Body() body: { days?: number },
    @GetEffectiveStoreId() effectiveStoreId: string | null,
  ) {
    const days = body?.days && body.days > 0 ? Math.min(body.days, 365) : 90;
    return this.syncService.requestSync(days, effectiveStoreId);
  }

  @Get('accounts')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.INTEGRATIONS_VIEW)
  accounts(@GetEffectiveStoreId() effectiveStoreId: string | null) {
    return this.adsService.listAccounts(effectiveStoreId);
  }

  @Get('pages')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.INTEGRATIONS_VIEW)
  @ApiOperation({ summary: 'Danh sách Fanpage + quyền (tasks) đã kết nối' })
  pages(@GetEffectiveStoreId() effectiveStoreId: string | null) {
    return this.adsService.listPages(effectiveStoreId);
  }

  @Get('summary')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.INTEGRATIONS_VIEW)
  summary(
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.adsService.summary(effectiveStoreId, from, to, accountId);
  }

  @Get('campaigns')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.INTEGRATIONS_VIEW)
  campaigns(
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.adsService.campaigns(effectiveStoreId, from, to, accountId);
  }

  @Get('campaigns/:id/adsets')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.INTEGRATIONS_VIEW)
  @ApiOperation({ summary: 'Nhóm quảng cáo (ad set) của 1 chiến dịch — drill-down' })
  adSets(
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.adsService.adSets(effectiveStoreId, id, from, to);
  }

  @Get('adsets/:id/ads')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.INTEGRATIONS_VIEW)
  @ApiOperation({ summary: 'Quảng cáo (ad) của 1 nhóm quảng cáo — drill-down' })
  ads(
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.adsService.ads(effectiveStoreId, id, from, to);
  }

  @Get('campaigns/:id/insights')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.INTEGRATIONS_VIEW)
  campaignInsights(
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.adsService.campaignInsights(effectiveStoreId, id, from, to);
  }
}
