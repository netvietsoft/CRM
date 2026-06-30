import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdsSyncService } from './ads-sync.service';
import { AdsService } from './ads.service';

@ApiTags('Ads')
@Controller('ads')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdsController {
  constructor(
    private readonly syncService: AdsSyncService,
    private readonly adsService: AdsService,
  ) {}

  @Post('sync')
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Đồng bộ ngay toàn bộ dữ liệu Meta Ads (mặc định 90 ngày)' })
  async syncNow(@Body() body: { days?: number }) {
    const days = body?.days && body.days > 0 ? Math.min(body.days, 365) : 90;
    return this.syncService.syncAll(days);
  }

  @Get('accounts')
  @Roles('ADMIN', 'MODERATOR')
  accounts() {
    return this.adsService.listAccounts();
  }

  @Get('summary')
  @Roles('ADMIN', 'MODERATOR')
  summary(@Query('from') from?: string, @Query('to') to?: string, @Query('accountId') accountId?: string) {
    return this.adsService.summary(from, to, accountId);
  }

  @Get('campaigns')
  @Roles('ADMIN', 'MODERATOR')
  campaigns(@Query('from') from?: string, @Query('to') to?: string, @Query('accountId') accountId?: string) {
    return this.adsService.campaigns(from, to, accountId);
  }

  @Get('campaigns/:id/insights')
  @Roles('ADMIN', 'MODERATOR')
  campaignInsights(@Param('id') id: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.adsService.campaignInsights(id, from, to);
  }
}
