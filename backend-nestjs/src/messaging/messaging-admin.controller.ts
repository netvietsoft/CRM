import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { GetEffectiveStoreId } from '../auth/decorators/get-effective-store-id.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permission } from '../auth/enums/permissions.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateAutomationRuleDto } from './dto/create-automation-rule.dto';
import { CreateImportedMessageCampaignDto } from './dto/create-imported-message-campaign.dto';
import { CreateMessageTemplateDto } from './dto/create-message-template.dto';
import { ListMessageCampaignsDto } from './dto/list-message-campaigns.dto';
import { ListMessageAutomationExecutionsDto } from './dto/list-message-automation-executions.dto';
import { ListMessageLogsDto } from './dto/list-message-logs.dto';
import { ListMessageSchedulesDto } from './dto/list-message-schedules.dto';
import { ListMessageTemplatesDto } from './dto/list-message-templates.dto';
import { PreviewAudienceDto } from './dto/preview-audience.dto';
import { PreviewMessageDto } from './dto/preview-message.dto';
import { SendFilteredCampaignDto } from './dto/send-filtered-campaign.dto';
import { SendSingleMessageDto } from './dto/send-single-message.dto';
import { UpdateAutomationRuleDto } from './dto/update-automation-rule.dto';
import { UpdateMessageScheduleDto } from './dto/update-message-schedule.dto';
import { UpdateMessageTemplateDto } from './dto/update-message-template.dto';
import { UpdateSmsProviderConfigDto } from './dto/update-sms-provider-config.dto';
import { MessagingAdminService } from './messaging-admin.service';

@ApiTags('Admin Messaging')
@Controller('admin/messaging')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'STAFF', 'MODERATOR')
@ApiBearerAuth()
export class MessagingAdminController {
  constructor(private readonly messagingAdminService: MessagingAdminService) {}

  @Get('operations/dashboard')
  @Permissions(Permission.MESSAGING_LOG_VIEW)
  @ApiOperation({ summary: 'Get messaging operations dashboard' })
  getOperationsDashboard(
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Query('days') days?: string,
  ) {
    return this.messagingAdminService.getOperationsDashboard(
      effectiveStoreId,
      days ? Number(days) : undefined,
    );
  }

  @Get('operations/health')
  @Permissions(Permission.MESSAGING_LOG_VIEW)
  @ApiOperation({ summary: 'Get messaging provider health and warnings' })
  getOperationsHealth(@GetEffectiveStoreId() effectiveStoreId: string | null) {
    return this.messagingAdminService.getOperationsHealth(effectiveStoreId);
  }

  @Get('sms-provider-config')
  @Permissions(Permission.MESSAGING_COMPOSE)
  @ApiOperation({ summary: 'Get SMS provider config for current scope' })
  getSmsProviderConfig(@GetEffectiveStoreId() effectiveStoreId: string | null) {
    return this.messagingAdminService.getSmsProviderConfig(effectiveStoreId);
  }

  @Put('sms-provider-config')
  @Permissions(Permission.MESSAGING_COMPOSE)
  @ApiOperation({ summary: 'Create or update SMS provider config for current scope' })
  upsertSmsProviderConfig(
    @GetUser('id') actorId: string,
    @GetUser('role') actorRole: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Body() dto: UpdateSmsProviderConfigDto,
  ) {
    return this.messagingAdminService.upsertSmsProviderConfig(
      actorId,
      actorRole,
      effectiveStoreId,
      dto,
    );
  }

  @Get('templates')
  @Permissions(Permission.MESSAGING_VIEW)
  @ApiOperation({ summary: 'List messaging templates' })
  listTemplates(
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Query() query: ListMessageTemplatesDto,
  ) {
    return this.messagingAdminService.listTemplates(effectiveStoreId, query);
  }

  @Post('templates')
  @Permissions(Permission.MESSAGING_COMPOSE)
  @ApiOperation({ summary: 'Create messaging template' })
  createTemplate(
    @GetUser('id') actorId: string,
    @GetUser('role') actorRole: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Body() dto: CreateMessageTemplateDto,
  ) {
    return this.messagingAdminService.createTemplate(actorId, actorRole, effectiveStoreId, dto);
  }

  @Get('templates/:id')
  @Permissions(Permission.MESSAGING_VIEW)
  @ApiOperation({ summary: 'Get template detail' })
  getTemplateDetail(
    @Param('id') id: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
  ) {
    return this.messagingAdminService.getTemplateDetail(id, effectiveStoreId);
  }

  @Patch('templates/:id')
  @Permissions(Permission.MESSAGING_COMPOSE)
  @ApiOperation({ summary: 'Update messaging template' })
  updateTemplate(
    @Param('id') id: string,
    @GetUser('id') actorId: string,
    @GetUser('role') actorRole: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Body() dto: UpdateMessageTemplateDto,
  ) {
    return this.messagingAdminService.updateTemplate(id, actorId, actorRole, effectiveStoreId, dto);
  }

  @Delete('templates/:id')
  @Permissions(Permission.MESSAGING_COMPOSE)
  @ApiOperation({ summary: 'Delete messaging template' })
  deleteTemplate(
    @Param('id') id: string,
    @GetUser('id') actorId: string,
    @GetUser('role') actorRole: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
  ) {
    return this.messagingAdminService.deleteTemplate(id, actorId, actorRole, effectiveStoreId);
  }

  @Post('preview')
  @Permissions(Permission.MESSAGING_COMPOSE)
  @ApiOperation({ summary: 'Preview rendered message content' })
  previewMessage(
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Body() dto: PreviewMessageDto,
  ) {
    return this.messagingAdminService.previewMessage(effectiveStoreId, dto);
  }

  @Post('audience-preview')
  @Permissions(Permission.MESSAGING_COMPOSE)
  @ApiOperation({ summary: 'Preview audience from current filters' })
  previewAudience(
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Body() dto: PreviewAudienceDto,
  ) {
    return this.messagingAdminService.previewAudience(effectiveStoreId, dto);
  }

  @Post('send-single')
  @Permissions(Permission.MESSAGING_SEND)
  @ApiOperation({ summary: 'Send message to a single recipient' })
  sendSingleMessage(
    @GetUser('id') actorId: string,
    @GetUser('role') actorRole: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Body() dto: SendSingleMessageDto,
  ) {
    return this.messagingAdminService.sendSingleMessage(actorId, actorRole, effectiveStoreId, dto);
  }

  @Post('campaigns')
  @Permissions(Permission.MESSAGING_COMPOSE)
  @ApiOperation({ summary: 'Create immediate or scheduled campaign from filters' })
  createCampaign(
    @GetUser('id') actorId: string,
    @GetUser('role') actorRole: string,
    @GetUser('staffPermissions') staffPermissions: string[] | null,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Body() dto: SendFilteredCampaignDto,
  ) {
    return this.messagingAdminService.createCampaign(
      actorId,
      actorRole,
      staffPermissions || [],
      effectiveStoreId,
      dto,
    );
  }

  @Post('campaigns/import')
  @Permissions(Permission.MESSAGING_COMPOSE)
  @ApiOperation({ summary: 'Create immediate or scheduled campaign from imported recipients' })
  createImportedCampaign(
    @GetUser('id') actorId: string,
    @GetUser('role') actorRole: string,
    @GetUser('staffPermissions') staffPermissions: string[] | null,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Body() dto: CreateImportedMessageCampaignDto,
  ) {
    return this.messagingAdminService.createImportedCampaign(
      actorId,
      actorRole,
      staffPermissions || [],
      effectiveStoreId,
      dto,
    );
  }

  @Get('campaigns')
  @Permissions(Permission.MESSAGING_VIEW)
  @ApiOperation({ summary: 'List messaging campaigns' })
  listCampaigns(
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Query() query: ListMessageCampaignsDto,
  ) {
    return this.messagingAdminService.listCampaigns(effectiveStoreId, query);
  }

  @Get('campaigns/:id')
  @Permissions(Permission.MESSAGING_VIEW)
  @ApiOperation({ summary: 'Get campaign detail' })
  getCampaignDetail(
    @Param('id') id: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
  ) {
    return this.messagingAdminService.getCampaignDetail(id, effectiveStoreId);
  }

  @Post('campaigns/:id/send-now')
  @Permissions(Permission.MESSAGING_SEND)
  @ApiOperation({ summary: 'Trigger campaign immediately' })
  sendCampaignNow(
    @Param('id') id: string,
    @GetUser('id') actorId: string,
    @GetUser('role') actorRole: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
  ) {
    return this.messagingAdminService.sendCampaignNow(id, actorId, actorRole, effectiveStoreId);
  }

  @Get('schedules')
  @Permissions(Permission.MESSAGING_SCHEDULE)
  @ApiOperation({ summary: 'List message schedules' })
  listSchedules(
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Query() query: ListMessageSchedulesDto,
  ) {
    return this.messagingAdminService.listSchedules(effectiveStoreId, query);
  }

  @Patch('schedules/:id')
  @Permissions(Permission.MESSAGING_SCHEDULE)
  @ApiOperation({ summary: 'Update message schedule' })
  updateSchedule(
    @Param('id') id: string,
    @GetUser('id') actorId: string,
    @GetUser('role') actorRole: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Body() dto: UpdateMessageScheduleDto,
  ) {
    return this.messagingAdminService.updateSchedule(id, actorId, actorRole, effectiveStoreId, dto);
  }

  @Patch('schedules/:id/cancel')
  @Permissions(Permission.MESSAGING_SCHEDULE)
  @ApiOperation({ summary: 'Cancel message schedule' })
  cancelSchedule(
    @Param('id') id: string,
    @GetUser('id') actorId: string,
    @GetUser('role') actorRole: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
  ) {
    return this.messagingAdminService.cancelSchedule(id, actorId, actorRole, effectiveStoreId);
  }

  @Get('logs/export/csv')
  @Permissions(Permission.MESSAGING_LOG_VIEW)
  @ApiOperation({ summary: 'Export message logs as CSV' })
  async exportLogsCsv(
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Query() query: ListMessageLogsDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.messagingAdminService.exportLogsCsv(effectiveStoreId, query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="message-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    return csv;
  }

  @Get('logs')
  @Permissions(Permission.MESSAGING_LOG_VIEW)
  @ApiOperation({ summary: 'List message logs' })
  listLogs(
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Query() query: ListMessageLogsDto,
  ) {
    return this.messagingAdminService.listLogs(effectiveStoreId, query);
  }

  @Get('logs/:id')
  @Permissions(Permission.MESSAGING_LOG_VIEW)
  @ApiOperation({ summary: 'Get message log detail' })
  getLogDetail(@Param('id') id: string, @GetEffectiveStoreId() effectiveStoreId: string | null) {
    return this.messagingAdminService.getLogDetail(id, effectiveStoreId);
  }

  @Post('logs/:id/retry')
  @Permissions(Permission.MESSAGING_SEND)
  @ApiOperation({ summary: 'Retry a failed message log manually' })
  retryFailedLog(
    @Param('id') id: string,
    @GetUser('id') actorId: string,
    @GetUser('role') actorRole: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
  ) {
    return this.messagingAdminService.retryFailedLog(id, actorId, actorRole, effectiveStoreId);
  }

  @Get('automation-rules')
  @Permissions(Permission.MESSAGING_RULE_MANAGE)
  @ApiOperation({ summary: 'List automation rules' })
  listAutomationRules(@GetEffectiveStoreId() effectiveStoreId: string | null) {
    return this.messagingAdminService.listAutomationRules(effectiveStoreId);
  }

  @Get('automation-rules/:id/executions')
  @Permissions(Permission.MESSAGING_RULE_MANAGE)
  @ApiOperation({ summary: 'List automation rule executions' })
  listAutomationExecutions(
    @Param('id') id: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Query() query: ListMessageAutomationExecutionsDto,
  ) {
    return this.messagingAdminService.listAutomationExecutions(id, effectiveStoreId, query);
  }

  @Get('automation-rules/:id')
  @Permissions(Permission.MESSAGING_RULE_MANAGE)
  @ApiOperation({ summary: 'Get automation rule detail' })
  getAutomationRuleDetail(
    @Param('id') id: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
  ) {
    return this.messagingAdminService.getAutomationRuleDetail(id, effectiveStoreId);
  }

  @Post('automation-rules')
  @Permissions(Permission.MESSAGING_RULE_MANAGE)
  @ApiOperation({ summary: 'Create automation rule' })
  createAutomationRule(
    @GetUser('id') actorId: string,
    @GetUser('role') actorRole: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Body() dto: CreateAutomationRuleDto,
  ) {
    return this.messagingAdminService.createAutomationRule(
      actorId,
      actorRole,
      effectiveStoreId,
      dto,
    );
  }

  @Patch('automation-rules/:id')
  @Permissions(Permission.MESSAGING_RULE_MANAGE)
  @ApiOperation({ summary: 'Update automation rule' })
  updateAutomationRule(
    @Param('id') id: string,
    @GetUser('id') actorId: string,
    @GetUser('role') actorRole: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Body() dto: UpdateAutomationRuleDto,
  ) {
    return this.messagingAdminService.updateAutomationRule(
      id,
      actorId,
      actorRole,
      effectiveStoreId,
      dto,
    );
  }

  @Delete('automation-rules/:id')
  @Permissions(Permission.MESSAGING_RULE_MANAGE)
  @ApiOperation({ summary: 'Delete automation rule' })
  deleteAutomationRule(
    @Param('id') id: string,
    @GetUser('id') actorId: string,
    @GetUser('role') actorRole: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
  ) {
    return this.messagingAdminService.deleteAutomationRule(
      id,
      actorId,
      actorRole,
      effectiveStoreId,
    );
  }
}
