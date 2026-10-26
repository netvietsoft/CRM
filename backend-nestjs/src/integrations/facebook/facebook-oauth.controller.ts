import { Body, Controller, Delete, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { Permission } from '../../auth/enums/permissions.enum';
import { Public } from '../../auth/decorators/public.decorator';
import { GetEffectiveStoreId } from '../../auth/decorators/get-effective-store-id.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { FacebookService } from './facebook.service';
import { MetaCatalogService } from './meta-catalog.service';

@ApiTags('Facebook OAuth')
@Controller('integrations/facebook')
export class FacebookOAuthController {
  constructor(
    private readonly service: FacebookService,
    private readonly catalogService: MetaCatalogService,
  ) {}

  @Get('oauth/start')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Roles('ADMIN', 'MODERATOR')
  @Permissions(Permission.INTEGRATIONS_MANAGE)
  @ApiOperation({ summary: 'Lấy URL dialog OAuth Facebook (FE mở)' })
  start(@GetEffectiveStoreId() storeId: string | null, @GetUser('id') userId: string) {
    return { url: this.service.startUrl(storeId, userId) };
  }

  // Facebook redirect về đây (public). Xong → về FE trang Kết nối.
  @Public()
  @Get('oauth/callback')
  @ApiExcludeEndpoint()
  async callback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    const fe = (process.env.FRONTEND_URL || 'http://localhost:3900').split(',')[0].trim();
    try {
      if (!code) throw new Error('missing code');
      const r = await this.service.handleCallback(code, state);
      const s: any = r.summary;
      return res.redirect(`${fe}/admin/integrations?fb=ok&biz=${s?.businesses ?? 0}&acc=${s?.adAccounts ?? 0}&page=${s?.pages ?? 0}`);
    } catch (e) {
      return res.redirect(`${fe}/admin/integrations?fb=error&msg=${encodeURIComponent((e as Error).message)}`);
    }
  }

  @Get('connections')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.INTEGRATIONS_VIEW)
  connections(@GetEffectiveStoreId() storeId: string | null) {
    return this.service.listConnections(storeId);
  }

  @Delete('connections/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Roles('ADMIN', 'MODERATOR')
  @Permissions(Permission.INTEGRATIONS_MANAGE)
  disconnect(@GetEffectiveStoreId() storeId: string | null, @Param('id') id: string) {
    return this.service.disconnect(storeId, id);
  }

  @Post('connections/:id/refresh')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Roles('ADMIN', 'MODERATOR')
  @Permissions(Permission.INTEGRATIONS_MANAGE)
  refresh(@Param('id') id: string) {
    return this.service.refresh(id);
  }

  @Get('catalogs')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.INTEGRATIONS_VIEW)
  @ApiOperation({ summary: 'Lấy danh sách Meta Commerce Catalogs' })
  getCatalogs(@GetEffectiveStoreId() storeId: string | null) {
    return this.catalogService.getAvailableCatalogs(storeId);
  }

  @Get('catalogs/status')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.INTEGRATIONS_VIEW)
  @ApiOperation({ summary: 'Lấy trạng thái đồng bộ Meta Catalog' })
  getCatalogStatus(@GetEffectiveStoreId() storeId: string | null) {
    return this.catalogService.getStatus(storeId);
  }

  @Post('catalogs/config')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Roles('ADMIN', 'MODERATOR')
  @Permissions(Permission.INTEGRATIONS_MANAGE)
  @ApiOperation({ summary: 'Lưu Meta Catalog ID để đồng bộ' })
  saveCatalogConfig(@GetEffectiveStoreId() storeId: string | null, @Body('catalogId') catalogId: string) {
    return this.catalogService.saveConfig(storeId, catalogId);
  }

  @Post('catalogs/sync')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Roles('ADMIN', 'MODERATOR')
  @Permissions(Permission.INTEGRATIONS_MANAGE)
  @ApiOperation({ summary: 'Đồng bộ sản phẩm CRM lên Meta Commerce Catalog (Batch API)' })
  syncCatalog(@GetEffectiveStoreId() storeId: string | null, @Body('catalogId') catalogId?: string) {
    return this.catalogService.syncProducts(storeId, catalogId);
  }
}
