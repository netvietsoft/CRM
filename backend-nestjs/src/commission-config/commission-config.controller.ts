import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CommissionConfigService } from './commission-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UpdateCommissionConfigDto } from './dto/update-commission-config.dto';

@ApiTags('Commission Config')
@Controller('commission-config')
export class CommissionConfigController {
  constructor(
    private readonly commissionConfigService: CommissionConfigService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all commission configurations' })
  async findAll() {
    const configs = await this.commissionConfigService.findAll();
    return { configs };
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update commission configuration (Admin only)' })
  async update(@Body() updateDto: UpdateCommissionConfigDto) {
    const config = await this.commissionConfigService.upsert(updateDto);
    return { success: true, config };
  }
}
