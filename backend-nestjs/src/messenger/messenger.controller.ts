import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permissions.enum';
import { GetEffectiveStoreId } from '../auth/decorators/get-effective-store-id.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { MessengerService } from './messenger.service';

@ApiTags('Messenger')
@Controller('messenger')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class MessengerController {
  constructor(private readonly service: MessengerService) {}

  @Get('pages')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.MESSENGER_VIEW)
  pages(@GetEffectiveStoreId() storeId: string | null) {
    return this.service.listPages(storeId);
  }

  @Post('pages/register')
  @Roles('ADMIN', 'MODERATOR')
  @Permissions(Permission.MESSENGER_SEND)
  @ApiOperation({ summary: 'Lấy các page có quyền MESSAGING từ token Meta → đăng ký MsgPage' })
  register() {
    return this.service.registerPages();
  }

  @Post('pages/:externalId/subscribe')
  @Roles('ADMIN', 'MODERATOR')
  @Permissions(Permission.MESSENGER_SEND)
  @ApiOperation({ summary: 'Bật webhook Messenger cho page' })
  subscribe(@GetEffectiveStoreId() storeId: string | null, @Param('externalId') externalId: string) {
    return this.service.subscribePage(storeId, externalId);
  }

  @Post('pages/:externalId/backfill')
  @Roles('ADMIN', 'MODERATOR')
  @Permissions(Permission.MESSENGER_SEND)
  @ApiOperation({ summary: 'Kéo lịch sử hội thoại gần đây của page' })
  backfill(@GetEffectiveStoreId() storeId: string | null, @Param('externalId') externalId: string) {
    return this.service.backfill(storeId, externalId);
  }

  @Get('conversations')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.MESSENGER_VIEW)
  conversations(
    @GetEffectiveStoreId() storeId: string | null,
    @Query('pageId') pageId?: string,
    @Query('q') q?: string,
  ) {
    return this.service.listConversations(storeId, pageId, q);
  }

  @Get('conversations/:id/messages')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.MESSENGER_VIEW)
  messages(@GetEffectiveStoreId() storeId: string | null, @Param('id') id: string) {
    return this.service.listMessages(storeId, id);
  }

  @Post('conversations/:id/read')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.MESSENGER_VIEW)
  read(@GetEffectiveStoreId() storeId: string | null, @Param('id') id: string) {
    return this.service.markRead(storeId, id);
  }

  @Post('conversations/:id/reply')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.MESSENGER_SEND)
  @ApiOperation({ summary: 'Trả lời khách (Send API, trong cửa sổ 24h)' })
  reply(
    @GetEffectiveStoreId() storeId: string | null,
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { text?: string; attachmentUrl?: string },
  ) {
    return this.service.reply(storeId, userId, id, body || {});
  }
}
