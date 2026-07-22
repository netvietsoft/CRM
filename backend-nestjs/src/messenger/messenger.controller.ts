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
import { MessengerAssignService, AssignConfig } from './messenger-assign.service';

@ApiTags('Messenger')
@Controller('messenger')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class MessengerController {
  constructor(
    private readonly service: MessengerService,
    private readonly assignService: MessengerAssignService,
  ) {}

  // ===== Trực page + chia hội thoại (rotation) =====
  @Get('assign/settings')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.MESSENGER_VIEW)
  @ApiOperation({ summary: 'Cài đặt chia hội thoại của page' })
  getAssignSettings(@Query('pageId') pageId: string) {
    return this.assignService.getSettings(pageId);
  }

  @Post('assign/settings')
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Lưu cài đặt chia hội thoại (mode + config)' })
  saveAssignSettings(@Body() body: { pageId: string; mode: string; config: AssignConfig }) {
    return this.assignService.saveSettings(body.pageId, body.mode, body.config || {});
  }

  @Get('assign/staff')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.MESSENGER_VIEW)
  @ApiOperation({ summary: 'Danh sách NV trực page' })
  getPageStaff(@Query('pageId') pageId: string) {
    return this.assignService.listPageStaff(pageId);
  }

  // Bảng phân quyền NV↔page (/ccm/settings/permissions): FULL = đầy đủ, VIEW = chỉ xem.
  @Get('assign/matrix')
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Toàn bộ phân quyền NV theo page' })
  getAccessMatrix() {
    return this.assignService.listPageAccessMatrix();
  }

  @Post('assign/access')
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Đặt quyền NV trên page (FULL/VIEW; null = gỡ)' })
  setAccess(@Body() body: { pageId: string; userId: string; access: string | null }) {
    return this.assignService.setPageAccess(body?.pageId, body?.userId, body?.access ?? null);
  }

  @Post('assign/staff')
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Gán danh sách NV trực page (ghi đè)' })
  setPageStaff(@Body() body: { pageId: string; userIds: string[] }) {
    return this.assignService.setPageStaff(body.pageId, body.userIds || []);
  }

  @Get('pages')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.MESSENGER_VIEW)
  pages(@GetEffectiveStoreId() storeId: string | null, @GetUser() user: { id: string; role?: string }) {
    return this.service.listPages(storeId, user);
  }

  @Get('stats')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.MESSENGER_VIEW)
  @ApiOperation({ summary: 'Thống kê tin nhắn/hội thoại thật (days ngày gần đây)' })
  stats(@GetEffectiveStoreId() storeId: string | null, @Query('days') days?: string) {
    return this.service.stats(storeId, days ? Math.min(90, Math.max(1, Number(days))) : 7);
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

  @Get('pages/:externalId/posts')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.MESSENGER_VIEW)
  @ApiOperation({ summary: 'Kéo bài viết đã đăng của page (Graph API)' })
  posts(@GetEffectiveStoreId() storeId: string | null, @Param('externalId') externalId: string) {
    return this.service.listPagePosts(storeId, externalId);
  }

  // Enrich lại avatar/tên khách còn thiếu (chạy tay sau khi app Meta được duyệt Live).
  @Post('contacts/enrich')
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Enrich lại contact thiếu avatar (trả lỗi Graph thật nếu có)' })
  enrichContacts(
    @GetEffectiveStoreId() storeId: string | null,
    @Body() body: { pageId?: string; limit?: number },
  ) {
    return this.service.enrichMissingAvatars(storeId, body?.pageId, body?.limit ?? 100);
  }

  @Get('conversations')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.MESSENGER_VIEW)
  conversations(
    @GetEffectiveStoreId() storeId: string | null,
    @GetUser() user: { id: string; role?: string },
    @Query('pageId') pageId?: string,
    @Query('q') q?: string,
  ) {
    return this.service.listConversations(storeId, pageId, q, user);
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

  @Post('conversations/:id/assign')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.MESSENGER_VIEW)
  @ApiOperation({ summary: 'Nhận xử lý (gán mình) / bỏ gán hội thoại' })
  assign(
    @GetEffectiveStoreId() storeId: string | null,
    @GetUser() user: { id: string; name?: string | null; email?: string | null },
    @Param('id') id: string,
    @Body() body: { assign?: boolean },
  ) {
    return this.service.assign(storeId, id, body?.assign === false ? null : user);
  }

  @Post('conversations/:id/assign-user')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.MESSENGER_VIEW)
  @ApiOperation({ summary: 'Phân công hội thoại cho 1 nhân viên cụ thể (userId rỗng = bỏ gán)' })
  assignUser(
    @GetEffectiveStoreId() storeId: string | null,
    @Param('id') id: string,
    @Body() body: { userId?: string | null },
  ) {
    return this.service.assignToUser(storeId, id, body?.userId || null);
  }

  @Post('conversations/:id/star')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.MESSENGER_VIEW)
  @ApiOperation({ summary: 'Đặt sao ưu tiên hội thoại (yellow|green|red|null)' })
  star(@GetEffectiveStoreId() storeId: string | null, @Param('id') id: string, @Body() body: { color?: string | null }) {
    return this.service.setStar(storeId, id, body?.color ?? null);
  }

  @Post('conversations/:id/contact-dob')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.MESSENGER_VIEW)
  @ApiOperation({ summary: 'Đặt ngày sinh khách (YYYY-MM-DD hoặc null) — đồng bộ User.dob nếu khớp SĐT' })
  contactDob(@GetEffectiveStoreId() storeId: string | null, @Param('id') id: string, @Body() body: { dob?: string | null }) {
    return this.service.setContactDob(storeId, id, body?.dob ?? null);
  }

  @Post('conversations/:id/contact-gender')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.MESSENGER_VIEW)
  @ApiOperation({ summary: 'Đặt giới tính khách (MALE|FEMALE|OTHER|null) — đồng bộ User.gender nếu khớp SĐT' })
  contactGender(@GetEffectiveStoreId() storeId: string | null, @Param('id') id: string, @Body() body: { gender?: string | null }) {
    return this.service.setContactGender(storeId, id, body?.gender ?? null);
  }

  @Post('conversations/:id/labels')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.MESSENGER_VIEW)
  @ApiOperation({ summary: 'Đặt nhãn cho hội thoại' })
  labels(
    @GetEffectiveStoreId() storeId: string | null,
    @Param('id') id: string,
    @Body() body: { labels?: string[] },
  ) {
    return this.service.setLabels(storeId, id, body?.labels);
  }

  @Post('conversations/:id/reply')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.MESSENGER_SEND)
  @ApiOperation({ summary: 'Trả lời khách (Send API, trong cửa sổ 24h)' })
  reply(
    @GetEffectiveStoreId() storeId: string | null,
    @GetUser() user: { id: string; role?: string },
    @Param('id') id: string,
    @Body() body: { text?: string; attachmentUrl?: string },
  ) {
    return this.service.reply(storeId, user.id, id, body || {}, user.role);
  }

  @Post('conversations/:id/messages/:messageId/recall')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.MESSENGER_SEND)
  @ApiOperation({ summary: 'Thu hồi tin đã gửi (chỉ ẩn trên CRM — khách vẫn thấy trên Messenger)' })
  recall(
    @GetEffectiveStoreId() storeId: string | null,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
  ) {
    return this.service.recallMessage(storeId, id, messageId);
  }
}
