import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RankConfigService } from './rank-config.service';
import { UpdateRankConfigDto } from './dto/update-rank-config.dto';

@ApiTags('Rank Config')
@Controller('rank-config')
export class RankConfigController {
  constructor(private readonly rankConfigService: RankConfigService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get rank configuration list' })
  async findAll() {
    const configs = await this.rankConfigService.findAll();
    return { configs };
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upsert rank configuration' })
  async update(@Body() updateDto: UpdateRankConfigDto) {
    const config = await this.rankConfigService.upsert(updateDto);
    return { success: true, config };
  }
}
