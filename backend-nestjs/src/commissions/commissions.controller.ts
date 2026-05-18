import { Controller, Get, Put, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CommissionsService } from './commissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Commissions')
@Controller('commissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get('network')
  @ApiOperation({ summary: 'Get user referral network' })
  getNetwork(@GetUser('id') userId: string) {
    return this.commissionsService.getNetwork(userId);
  }

  @Get('ledger')
  @ApiOperation({ summary: 'Get user commission ledger' })
  getLedger(@GetUser('id') userId: string, @Query('limit') limit?: number) {
    return this.commissionsService.getLedger(userId, limit ? Number(limit) : undefined);
  }

  @Get('configs')
  @ApiOperation({ summary: 'Get commission configurations' })
  getConfigs() {
    return this.commissionsService.getConfigs();
  }

  @Get('admin/ledger')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all commissions for Admin' })
  async findAllAdmin(@Query('limit') limit?: number) {
    return this.commissionsService.findAllAdmin(limit ? Number(limit) : undefined);
  }

  @Get('admin/stats')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get collective commission stats' })
  async getStatsAdmin() {
    return this.commissionsService.getStatsAdmin();
  }

  @Get('admin/configs')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all commission configs for Admin' })
  async getAllConfigsAdmin() {
    return this.commissionsService.getAllConfigsAdmin();
  }

  @Get('admin/referral-stats')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get collective referral program stats' })
  async getReferralProgramStatsAdmin() {
    return this.commissionsService.getReferralProgramStatsAdmin();
  }

  @Get('admin/top-referrers')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get top influencers by commission' })
  async getTopReferrersAdmin(@Query('limit') limit?: number) {
    return this.commissionsService.getTopReferrersAdmin(limit ? Number(limit) : undefined);
  }

  @Put('admin/configs')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a commission rate' })
  async updateConfigAdmin(@Body() data: { level: number; percentage: number }) {
    return this.commissionsService.updateConfigAdmin(data.level, data.percentage);
  }
}
