import { Body, Controller, Get, Param, Post, Put, Query, UseGuards, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permissions.enum';
import { GetEffectiveStoreId } from '../auth/decorators/get-effective-store-id.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { MessengerService } from '../messenger/messenger.service';
import { OrdersService } from '../orders/orders.service';
import { AnthropicClient } from './anthropic.client';

@ApiTags('AiAgent')
@Controller('ai-agent')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class AiAgentController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicClient,
    @Inject(forwardRef(() => MessengerService)) private readonly messenger: MessengerService,
    private readonly orders: OrdersService,
  ) {}

  @Get('config')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.MESSENGER_VIEW)
  @ApiOperation({ summary: 'Cấu hình AI theo page + cờ đã cấu hình key' })
  async getConfig(@GetEffectiveStoreId() storeId: string | null, @Query('pageId') pageId?: string) {
    if (!pageId) return { config: null, configured: this.anthropic.isEnabled() };
    await this.messenger.assertPageInStore(storeId, pageId); // scope: page phải thuộc store của caller
    const config = await this.prisma.aiAgentConfig.findUnique({ where: { pageId } });
    return { config, configured: this.anthropic.isEnabled() };
  }

  @Put('config')
  @Roles('ADMIN', 'MODERATOR')
  @Permissions(Permission.MESSENGER_SEND)
  async putConfig(@GetEffectiveStoreId() storeId: string | null, @Body() body: { pageId: string; enabled?: boolean; mode?: string; persona?: string; dailyTokenCap?: number }) {
    const { pageId, ...rest } = body;
    if (!pageId) throw new NotFoundException('Thiếu pageId');
    await this.messenger.assertPageInStore(storeId, pageId); // scope: chỉ cấu hình page thuộc store mình
    return this.prisma.aiAgentConfig.upsert({ where: { pageId }, create: { pageId, ...rest }, update: rest });
  }

  @Get('suggestions')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.MESSENGER_VIEW)
  async suggestions(@GetEffectiveStoreId() storeId: string | null, @Query('conversationId') conversationId: string) {
    await this.messenger.assertConversationInStore(storeId, conversationId); // scope: hội thoại phải thuộc store
    return this.prisma.aiSuggestion.findMany({ where: { conversationId, status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 20 });
  }

  @Post('suggestions/:id/approve')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.MESSENGER_SEND)
  @ApiOperation({ summary: 'Duyệt gợi ý AI: gửi reply + tạo đơn nếu có draft' })
  async approve(@Param('id') id: string, @GetEffectiveStoreId() storeId: string | null, @GetUser('id') userId: string, @GetUser('role') role: string) {
    const s = await this.prisma.aiSuggestion.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Không thấy gợi ý');
    await this.messenger.assertConversationInStore(storeId, s.conversationId); // scope: gợi ý phải thuộc hội thoại của store
    if (s.replyText) { try { await this.messenger.reply(storeId, userId, s.conversationId, { text: s.replyText }); } catch { /* ignore */ } }
    const draft = s.orderDraft as any;
    let orderCode: string | undefined;
    if (draft?.items?.length && draft.name && draft.phone) {
      const r = await this.orders.createAdminOrder({
        actorId: userId, actorRole: role, effectiveStoreId: storeId,
        createOrderDto: {
          items: draft.items.map((it: any) => ({ productId: String(it.productId), quantity: Number(it.quantity) || 1, unitPrice: it.unitPrice != null ? Number(it.unitPrice) : undefined })),
          shippingName: draft.name, shippingPhone: draft.phone, shippingStreet: draft.address || undefined,
          paymentMethod: 'COD', status: 'PENDING',
          metadata: { aiGenerated: true, source: 'CCM_AI', conversationId: s.conversationId, approvedBy: userId },
        } as any,
      });
      orderCode = r.orderCode;
    }
    await this.prisma.aiSuggestion.update({ where: { id }, data: { status: 'SENT' } });
    return { ok: true, orderCode };
  }

  @Post('conversations/:id/pause')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @Permissions(Permission.MESSENGER_SEND)
  @ApiOperation({ summary: 'Tạm dừng AI cho 1 hội thoại (người tiếp quản)' })
  async pause(@GetEffectiveStoreId() storeId: string | null, @Param('id') conversationId: string) {
    await this.messenger.assertConversationInStore(storeId, conversationId); // scope: chỉ tạm dừng hội thoại thuộc store
    await this.prisma.aiConversationState.upsert({ where: { conversationId }, create: { conversationId, status: 'PAUSED' }, update: { status: 'PAUSED' } });
    return { ok: true };
  }
}
