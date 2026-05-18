import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SpinService } from './spin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Spin Wheel')
@Controller('spin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SpinController {
  constructor(private readonly spinService: SpinService) {}

  @Get('attempts')
  @ApiOperation({ summary: 'Get user spin attempts' })
  async getUserSpinAttempts(@GetUser('id') userId: string) {
    return this.spinService.getUserSpinAttempts(userId);
  }

  @Get('prizes')
  @ApiOperation({ summary: 'Get all active spin prizes' })
  async getPrizes() {
    return this.spinService.getPrizes();
  }

  @Get('history')
  @ApiOperation({ summary: 'Get user recent spin history' })
  async getHistory(@GetUser('id') userId: string) {
    return this.spinService.getHistory(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Spin the wheel' })
  async spin(@GetUser('id') userId: string) {
    return this.spinService.spin(userId);
  }

  // Admin Endpoints
  @Get('admin/prizes')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all prizes for Admin' })
  async findAllAdmin() {
    return this.spinService.findAllAdmin();
  }

  @Get('admin/stats')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get collective spin stats' })
  async getStatsAdmin() {
    return this.spinService.getStatsAdmin();
  }

  @Post('admin/prizes')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new spin prize' })
  async createPrize(@Body() data: any) {
    return this.spinService.createPrize(data);
  }

  @Put('admin/prizes/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a spin prize' })
  async updatePrize(@Param('id') id: string, @Body() data: any) {
    return this.spinService.updatePrize(id, data);
  }

  @Delete('admin/prizes/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a spin prize' })
  async removePrize(@Param('id') id: string) {
    return this.spinService.removePrize(id);
  }

  @Post('add-attempts')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Add spin attempts to user (Admin only)' })
  async addSpinAttempts(
    @Body() data: { userId: string; attempts: number },
  ) {
    return this.spinService.addSpinAttempts(data.userId, data.attempts);
  }
}
