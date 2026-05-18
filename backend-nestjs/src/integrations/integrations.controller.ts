import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permissions.enum';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { GetEffectiveStoreId } from '../auth/decorators/get-effective-store-id.decorator';

@ApiTags('Integrations')
@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.INTEGRATIONS_MANAGE)
  @ApiOperation({ summary: 'Get all integrations' })
  async findAll(
    @GetUser() user: any,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Query('storeId') storeId?: string,
  ) {
    return this.integrationsService.findAll(user, effectiveStoreId, storeId);
  }

  @Post()
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.INTEGRATIONS_MANAGE)
  @ApiOperation({ summary: 'Upsert an integration config' })
  async upsert(
    @GetUser() user: any,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Body() data: any,
  ) {
    return this.integrationsService.upsert(user, effectiveStoreId, data);
  }
}
