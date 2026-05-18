import { Controller, Get, Post, Delete, Param, Query, UseGuards, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { ZbsTemplateService } from './zbs-template.service';
import { ZaloTokenService } from './zalo-token.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { SendBulkZaloDto } from './dto/send-bulk-zalo.dto';
import { CreateZbsTemplateDto } from './dto/create-template.dto';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly zbsTemplateService: ZbsTemplateService,
    private readonly zaloTokenService: ZaloTokenService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getUserNotifications(
    @GetUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 20;
    return this.notificationsService.getUserNotifications(userId, pageNum, limitNum);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@GetUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  async deleteNotification(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.notificationsService.deleteNotification(id, userId);
  }

  // --- Zalo ZNS Admin Endpoints ---

  @Get('zalo/config')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @ApiOperation({ summary: 'Check if Zalo ZNS is configured in environment' })
  async getZaloConfig() {
    return {
      isConfigured: !!process.env.ZALO_APP_ID && !!process.env.ZALO_APP_SECRET,
    };
  }

  @Post('zalo/bulk')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @ApiOperation({ summary: 'Send bulk Zalo ZNS messages' })
  async sendBulkZalo(@Body() dto: SendBulkZaloDto) {
    return this.notificationsService.sendBulkZalo(dto);
  }

  @Get('zalo/templates')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @ApiOperation({ summary: 'Get all Zalo templates' })
  async getZaloTemplates() {
    return this.notificationsService.getZaloTemplates();
  }

  @Post('zalo/templates')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Create a new Zalo PROMOTION template via ZBS' })
  async createZaloTemplate(@Body() dto: CreateZbsTemplateDto) {
    return this.zbsTemplateService.createPromotionTemplate(dto);
  }

  @Post('zalo/templates/:id/sync')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Sync template status from Zalo API' })
  async syncTemplateStatus(@Param('id') id: string) {
    return this.zbsTemplateService.syncTemplateStatus(id);
  }

  @Post('zalo/token/refresh')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Manually refresh Zalo Access Token' })
  async refreshZaloToken() {
    return this.zaloTokenService.manualRefresh();
  }
}
