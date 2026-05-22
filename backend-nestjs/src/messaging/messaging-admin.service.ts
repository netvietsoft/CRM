import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  MessageAudienceSource,
  MessageAudienceStatus,
  MessageCampaignStatus,
  MessageChannelCode,
  MessageLogStatus,
  MessageScheduleStatus,
  MessageSendMode,
  MessageTemplateKind,
  Prisma,
} from '@prisma/client';
import { Permission } from '../auth/enums/permissions.enum';
import { SmsService } from '../integrations/sms/sms.service';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from './messaging.service';
import { CreateAutomationRuleDto } from './dto/create-automation-rule.dto';
import {
  CreateImportedMessageCampaignDto,
  ImportedMessageRecipientDto,
} from './dto/create-imported-message-campaign.dto';
import { CreateMessageTemplateDto } from './dto/create-message-template.dto';
import { ListMessageAutomationExecutionsDto } from './dto/list-message-automation-executions.dto';
import { ListMessageCampaignsDto } from './dto/list-message-campaigns.dto';
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
import { MessagingAudienceService } from './messaging-audience.service';

interface CampaignAudienceInput {
  storeId?: string | null;
  userId?: string | null;
  orderId?: string | null;
  recipientName?: string | null;
  recipientValue: string;
  snapshotData?: Prisma.InputJsonValue | null;
}

@Injectable()
export class MessagingAdminService {
  private readonly logger = new Logger(MessagingAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messagingService: MessagingService,
    private readonly audienceService: MessagingAudienceService,
    private readonly smsService: SmsService,
  ) {}

  async getOperationsDashboard(effectiveStoreId: string | null, days?: number) {
    const windowDays = Math.max(Math.min(days || 30, 365), 1);
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - windowDays);
    const baseWhere: Prisma.MessageLogWhereInput = {
      ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
      createdAt: {
        gte: sinceDate,
      },
    };
    const [totalCount, queuedCount, failedCount, skippedCount, successGroups, channelGroups] =
      await Promise.all([
        this.prisma.messageLog.count({ where: baseWhere }),
        this.prisma.messageLog.count({
          where: {
            ...baseWhere,
            status: MessageLogStatus.QUEUED,
          },
        }),
        this.prisma.messageLog.count({
          where: {
            ...baseWhere,
            status: MessageLogStatus.FAILED,
          },
        }),
        this.prisma.messageLog.count({
          where: {
            ...baseWhere,
            status: MessageLogStatus.SKIPPED,
          },
        }),
        this.prisma.messageLog.groupBy({
          by: ['status'],
          where: {
            ...baseWhere,
            status: {
              in: [MessageLogStatus.SENT, MessageLogStatus.DELIVERED, MessageLogStatus.READ],
            },
          },
          _count: {
            _all: true,
          },
        }),
        this.prisma.messageLog.groupBy({
          by: ['channelId', 'status'],
          where: baseWhere,
          _count: {
            _all: true,
          },
        }),
      ]);
    const successCount = successGroups.reduce((sum, item) => sum + item._count._all, 0);
    const attemptedCount = successCount + failedCount + skippedCount;
    const successRate = attemptedCount > 0 ? Number((successCount / attemptedCount).toFixed(4)) : 0;
    const errorRate = attemptedCount > 0 ? Number((failedCount / attemptedCount).toFixed(4)) : 0;
    const channels = await this.prisma.messageChannel.findMany({
      where: {
        id: {
          in: Array.from(new Set(channelGroups.map((item) => item.channelId))),
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });
    const channelMap = new Map(channels.map((channel) => [channel.id, channel]));
    const groupedByChannel = new Map<
      string,
      {
        channelId: string;
        totalCount: number;
        queuedCount: number;
        successCount: number;
        failedCount: number;
        skippedCount: number;
      }
    >();

    for (const item of channelGroups) {
      const current = groupedByChannel.get(item.channelId) || {
        channelId: item.channelId,
        totalCount: 0,
        queuedCount: 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
      };
      current.totalCount += item._count._all;

      if (item.status === MessageLogStatus.QUEUED) {
        current.queuedCount += item._count._all;
      } else if (
        item.status === MessageLogStatus.SENT ||
        item.status === MessageLogStatus.DELIVERED ||
        item.status === MessageLogStatus.READ
      ) {
        current.successCount += item._count._all;
      } else if (item.status === MessageLogStatus.FAILED) {
        current.failedCount += item._count._all;
      } else if (item.status === MessageLogStatus.SKIPPED) {
        current.skippedCount += item._count._all;
      }

      groupedByChannel.set(item.channelId, current);
    }

    return {
      windowDays,
      totalCount,
      attemptedCount,
      queuedCount,
      successCount,
      failedCount,
      skippedCount,
      successRate,
      errorRate,
      channelBreakdown: Array.from(groupedByChannel.values()).map((item) => {
        const attempted = item.successCount + item.failedCount + item.skippedCount;
        const channel = channelMap.get(item.channelId);

        return {
          channelId: item.channelId,
          channelCode: channel?.code || 'SMS',
          channelName: channel?.name || 'SMS',
          totalCount: item.totalCount,
          queuedCount: item.queuedCount,
          successCount: item.successCount,
          failedCount: item.failedCount,
          skippedCount: item.skippedCount,
          successRate: attempted > 0 ? Number((item.successCount / attempted).toFixed(4)) : 0,
          errorRate: attempted > 0 ? Number((item.failedCount / attempted).toFixed(4)) : 0,
        };
      }),
    };
  }

  async getOperationsHealth(effectiveStoreId: string | null) {
    const smsHealth = await this.smsService.getProviderHealth();
    const recentFailureCount = await this.prisma.messageLog.count({
      where: {
        ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
        status: MessageLogStatus.FAILED,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });
    const warnings = [...smsHealth.warnings];

    if (recentFailureCount >= 10) {
      warnings.push(`Có ${recentFailureCount} log lỗi trong 24 giờ gần nhất`);
    }

    return {
      providerStatuses: [smsHealth],
      warnings,
      recentFailureCount,
    };
  }

  async getSmsProviderConfig(effectiveStoreId: string | null) {
    const channel = await this.requireChannel(MessageChannelCode.SMS);
    const [providerConfig, health] = await Promise.all([
      this.prisma.messageProviderConfig.findFirst({
        where: {
          channelId: channel.id,
          ...(effectiveStoreId ? { storeId: effectiveStoreId } : { storeId: null }),
        },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      }),
      this.smsService.getProviderHealth(),
    ]);
    const settings = this.toPlainObject(providerConfig?.settings || null);
    const secretSettings = this.toPlainObject(providerConfig?.secretSettings || null);

    return {
      config: providerConfig
        ? {
            id: providerConfig.id,
            name: providerConfig.name,
            providerKey: providerConfig.providerKey,
            storeId: providerConfig.storeId,
            isActive: providerConfig.isActive,
            isDefault: providerConfig.isDefault,
            apiUrl: this.getString(settings.apiUrl),
            brandName: this.getString(settings.brandName),
            user: this.getString(secretSettings.user),
            pass: this.getString(secretSettings.pass),
            updatedAt: providerConfig.updatedAt,
          }
        : null,
      health,
      scope: effectiveStoreId ? 'STORE' : 'GLOBAL',
    };
  }

  async upsertSmsProviderConfig(
    actorId: string,
    actorRole: string,
    effectiveStoreId: string | null,
    dto: UpdateSmsProviderConfigDto,
  ) {
    const channel = await this.requireChannel(MessageChannelCode.SMS);
    const storeId = effectiveStoreId || null;
    const existing = await this.prisma.messageProviderConfig.findFirst({
      where: {
        channelId: channel.id,
        storeId,
      },
    });
    const providerConfig = existing
      ? await this.prisma.messageProviderConfig.update({
          where: { id: existing.id },
          data: {
            name: dto.name?.trim() || 'SMS Provider',
            providerKey: 'NETVIET_SMS_HTTP',
            settings: this.toJsonValue({
              apiUrl: dto.apiUrl.trim(),
              brandName: dto.brandName.trim(),
            }),
            secretSettings: this.toJsonValue({
              user: dto.user.trim(),
              pass: dto.pass.trim(),
            }),
            isActive: dto.isActive ?? true,
            isDefault: dto.isDefault ?? !storeId,
          },
        })
      : await this.prisma.messageProviderConfig.create({
          data: {
            channelId: channel.id,
            storeId,
            name: dto.name?.trim() || 'SMS Provider',
            providerKey: 'NETVIET_SMS_HTTP',
            settings: this.toJsonValue({
              apiUrl: dto.apiUrl.trim(),
              brandName: dto.brandName.trim(),
            }),
            secretSettings: this.toJsonValue({
              user: dto.user.trim(),
              pass: dto.pass.trim(),
            }),
            isActive: dto.isActive ?? true,
            isDefault: dto.isDefault ?? !storeId,
          },
        });

    await this.createAuditLog({
      actorId,
      actorRole,
      storeId,
      action: existing ? 'SMS_PROVIDER_CONFIG_UPDATED' : 'SMS_PROVIDER_CONFIG_CREATED',
      entityType: 'message_provider_config',
      entityId: providerConfig.id,
      payload: {
        providerKey: providerConfig.providerKey,
        scope: storeId ? 'STORE' : 'GLOBAL',
        isActive: providerConfig.isActive,
        isDefault: providerConfig.isDefault,
        apiUrl: dto.apiUrl.trim(),
        brandName: dto.brandName.trim(),
        user: this.maskSensitiveValue(dto.user),
      },
    });

    return this.getSmsProviderConfig(effectiveStoreId);
  }

  async listTemplates(effectiveStoreId: string | null, query: ListMessageTemplatesDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const where = this.buildTemplateListWhere(effectiveStoreId, query);

    const [items, total] = await Promise.all([
      this.prisma.messageTemplate.findMany({
        where,
        include: {
          channel: true,
          store: {
            select: { id: true, name: true, slug: true },
          },
          createdBy: {
            select: { id: true, name: true, phone: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.messageTemplate.count({ where }),
    ]);

    return this.paginate(items, total, page, limit);
  }

  async createTemplate(
    actorId: string,
    actorRole: string,
    effectiveStoreId: string | null,
    dto: CreateMessageTemplateDto,
  ) {
    const channel = await this.requireChannel(dto.channelCode);
    const storeId = this.resolveScopedStoreId(actorRole, effectiveStoreId, dto.storeId);

    const template = await this.prisma.messageTemplate.create({
      data: {
        channelId: channel.id,
        storeId,
        createdById: actorId,
        name: dto.name,
        kind: dto.kind || MessageTemplateKind.CUSTOM,
        content: dto.content,
        variables: dto.variables || [],
        metadata: this.toJsonValue(dto.metadata),
        isActive: dto.isActive ?? true,
      },
      include: {
        channel: true,
        store: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    await this.createAuditLog({
      actorId,
      actorRole,
      storeId,
      action: 'MESSAGE_TEMPLATE_CREATED',
      entityType: 'message_template',
      entityId: template.id,
      payload: {
        channelCode: dto.channelCode,
        name: template.name,
        kind: template.kind,
        isActive: template.isActive,
      },
    });

    return template;
  }

  async getTemplateDetail(id: string, effectiveStoreId: string | null) {
    const template = await this.prisma.messageTemplate.findUnique({
      where: { id },
      include: {
        channel: true,
        store: {
          select: { id: true, name: true, slug: true },
        },
        createdBy: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    this.ensureTemplateReadScope(template.storeId, effectiveStoreId);
    return template;
  }

  async updateTemplate(
    id: string,
    actorId: string,
    actorRole: string,
    effectiveStoreId: string | null,
    dto: UpdateMessageTemplateDto,
  ) {
    const existing = await this.prisma.messageTemplate.findUnique({
      where: { id },
      include: { channel: true },
    });

    if (!existing) {
      throw new NotFoundException('Template not found');
    }

    this.ensureTemplateWriteScope(existing.storeId, effectiveStoreId);

    let channelId = existing.channelId;
    if (dto.channelCode && dto.channelCode !== existing.channel.code) {
      const channel = await this.requireChannel(dto.channelCode);
      channelId = channel.id;
    }

    const storeId =
      dto.storeId !== undefined
        ? this.resolveScopedStoreId(actorRole, effectiveStoreId, dto.storeId)
        : existing.storeId;

    const updatedTemplate = await this.prisma.messageTemplate.update({
      where: { id },
      data: {
        channelId,
        storeId,
        name: dto.name,
        kind: dto.kind,
        content: dto.content,
        variables: dto.variables,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        isActive: dto.isActive,
      },
      include: {
        channel: true,
        store: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    await this.createAuditLog({
      actorId,
      actorRole,
      storeId: updatedTemplate.storeId,
      action: 'MESSAGE_TEMPLATE_UPDATED',
      entityType: 'message_template',
      entityId: updatedTemplate.id,
      payload: {
        previousChannelCode: existing.channel.code,
        channelCode: updatedTemplate.channel.code,
        name: updatedTemplate.name,
        kind: updatedTemplate.kind,
        isActive: updatedTemplate.isActive,
      },
    });

    return updatedTemplate;
  }

  async deleteTemplate(
    id: string,
    actorId: string,
    actorRole: string,
    effectiveStoreId: string | null,
  ) {
    const existing = await this.prisma.messageTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Template not found');
    }

    this.ensureTemplateWriteScope(existing.storeId, effectiveStoreId);
    await this.prisma.messageTemplate.delete({ where: { id } });

    await this.createAuditLog({
      actorId,
      actorRole,
      storeId: existing.storeId,
      action: 'MESSAGE_TEMPLATE_DELETED',
      entityType: 'message_template',
      entityId: existing.id,
      payload: {
        name: existing.name,
        kind: existing.kind,
      },
    });

    return { success: true };
  }

  async previewMessage(effectiveStoreId: string | null, dto: PreviewMessageDto) {
    return this.messagingService.previewMessage({
      channelCode: dto.channelCode,
      recipient: dto.recipient,
      storeId: effectiveStoreId || undefined,
      userId: dto.userId,
      orderId: dto.orderId,
      templateId: dto.templateId,
      providerConfigId: dto.providerConfigId,
      messageContent: dto.messageContent,
      templateVariables: dto.templateVariables,
    });
  }

  async previewAudience(effectiveStoreId: string | null, dto: PreviewAudienceDto) {
    const previewLimit = Math.min(Math.max(dto.filters?.limit || 20, 1), 100);
    const audienceRecords = await this.audienceService.resolveAudienceRecords(
      dto.channelCode,
      dto.source,
      {
        ...dto.filters,
        limit: previewLimit,
      },
      effectiveStoreId,
    );

    const items = audienceRecords.map((record) => {
      const snapshot = this.toPlainObject(record.snapshotData as Prisma.JsonValue);

      return {
        recipient: record.recipient,
        recipientName: record.recipientName || null,
        userId: record.userId || null,
        orderId: record.orderId || null,
        customerName:
          this.getString(snapshot.customerName) ||
          this.getString(snapshot.shippingName) ||
          record.recipientName ||
          null,
        phone: this.getString(snapshot.phone) || this.getString(snapshot.shippingPhone) || null,
        email: this.getString(snapshot.email) || null,
        orderCode: this.getString(snapshot.orderCode) || null,
        orderCount: this.getNumber(snapshot.orderCount),
        totalSpent: this.getNumber(snapshot.totalSpent),
        totalAmount: this.getNumber(snapshot.totalAmount),
        orderStatus: this.getString(snapshot.orderStatus) || null,
        paymentStatus: this.getString(snapshot.paymentStatus) || null,
      };
    });

    return {
      totalCount: items.length,
      previewCount: items.length,
      previewLimit,
      source: dto.source,
      channelCode: dto.channelCode,
      items,
    };
  }

  async sendSingleMessage(
    actorId: string,
    actorRole: string,
    effectiveStoreId: string | null,
    dto: SendSingleMessageDto,
  ) {
    const messageLog = await this.messagingService.queueMessage({
      channelCode: dto.channelCode,
      recipient: dto.recipient,
      recipientName: dto.recipientName,
      storeId: effectiveStoreId || undefined,
      userId: dto.userId,
      orderId: dto.orderId,
      templateId: dto.templateId,
      providerConfigId: dto.providerConfigId,
      messageContent: dto.messageContent,
      templateVariables: dto.templateVariables,
      metadata: this.toJsonValue(dto.metadata),
      createdById: actorId,
    });

    await this.createAuditLog({
      actorId,
      actorRole,
      storeId: effectiveStoreId,
      action: 'MESSAGE_SINGLE_QUEUED',
      entityType: 'message_log',
      entityId: messageLog.id,
      payload: {
        channelCode: dto.channelCode,
        recipient: dto.recipient,
        recipientName: dto.recipientName || null,
        status: messageLog.status,
        templateId: dto.templateId || null,
      },
    });

    return {
      success: true,
      messageLogId: messageLog.id,
      status: messageLog.status,
    };
  }

  async createCampaign(
    actorId: string,
    actorRole: string,
    staffPermissions: string[],
    effectiveStoreId: string | null,
    dto: SendFilteredCampaignDto,
  ) {
    this.ensureCanSchedule(actorRole, staffPermissions, dto.scheduledAt);
    const channel = await this.requireChannel(dto.channelCode);
    const template = dto.templateId
      ? await this.requireScopedTemplate(dto.templateId, channel.id, effectiveStoreId)
      : null;
    const providerConfig = dto.providerConfigId
      ? await this.requireScopedProviderConfig(dto.providerConfigId, channel.id, effectiveStoreId)
      : null;
    const audienceRecords = await this.audienceService.resolveAudienceRecords(
      dto.channelCode,
      dto.source,
      dto.filters,
      effectiveStoreId,
    );

    if (audienceRecords.length === 0) {
      throw new BadRequestException('Khong tim thay nguoi nhan hop le');
    }

    return this.createCampaignFromAudienceInputs(
      actorId,
      actorRole,
      effectiveStoreId,
      {
        channelId: channel.id,
        templateId: template?.id || null,
        providerConfigId: providerConfig?.id || null,
        name: dto.name,
        audienceSource: MessageAudienceSource.FILTER,
        filters: dto.filters,
        messageContent: dto.messageContent || template?.content,
        scheduledAt: dto.scheduledAt,
        metadata: {
          ...(dto.metadata || {}),
          templateVariables: dto.templateVariables || {},
          source: dto.source,
        },
      },
      audienceRecords.map((audienceRecord) => ({
        storeId: audienceRecord.storeId || effectiveStoreId || null,
        userId: audienceRecord.userId || null,
        orderId: audienceRecord.orderId || null,
        recipientName: audienceRecord.recipientName || null,
        recipientValue: audienceRecord.recipient,
        snapshotData: this.toJsonValue(audienceRecord.snapshotData),
      })),
    );
  }

  async createImportedCampaign(
    actorId: string,
    actorRole: string,
    staffPermissions: string[],
    effectiveStoreId: string | null,
    dto: CreateImportedMessageCampaignDto,
  ) {
    this.ensureCanSchedule(actorRole, staffPermissions, dto.scheduledAt);
    const channel = await this.requireChannel(dto.channelCode);
    const template = dto.templateId
      ? await this.requireScopedTemplate(dto.templateId, channel.id, effectiveStoreId)
      : null;
    const providerConfig = dto.providerConfigId
      ? await this.requireScopedProviderConfig(dto.providerConfigId, channel.id, effectiveStoreId)
      : null;
    const importedAudiences = this.normalizeImportedRecipients(dto.recipients, effectiveStoreId);

    if (importedAudiences.length === 0) {
      throw new BadRequestException('Khong tim thay nguoi nhan hop le trong file import');
    }

    return this.createCampaignFromAudienceInputs(
      actorId,
      actorRole,
      effectiveStoreId,
      {
        channelId: channel.id,
        templateId: template?.id || null,
        providerConfigId: providerConfig?.id || null,
        name: dto.name,
        audienceSource: MessageAudienceSource.IMPORT,
        filters: null,
        messageContent: dto.messageContent || template?.content,
        scheduledAt: dto.scheduledAt,
        metadata: {
          ...(dto.metadata || {}),
          templateVariables: dto.templateVariables || {},
          importSummary: {
            originalCount: dto.recipients.length,
            validCount: importedAudiences.length,
          },
          source: 'IMPORT',
        },
      },
      importedAudiences,
    );
  }

  async listCampaigns(effectiveStoreId: string | null, query: ListMessageCampaignsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const where: Prisma.MessageCampaignWhereInput = {
      ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
      ...(query.channelCode
        ? {
            channel: {
              code: query.channelCode,
            },
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { messageContent: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.messageCampaign.findMany({
        where,
        include: {
          channel: true,
          store: {
            select: { id: true, name: true, slug: true },
          },
          template: {
            select: { id: true, name: true },
          },
          providerConfig: {
            select: { id: true, name: true, providerKey: true },
          },
          _count: {
            select: {
              audiences: true,
              logs: true,
              schedules: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.messageCampaign.count({ where }),
    ]);

    return this.paginate(items, total, page, limit);
  }

  async getCampaignDetail(id: string, effectiveStoreId: string | null) {
    const campaign = await this.prisma.messageCampaign.findFirst({
      where: {
        id,
        ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
      },
      include: {
        channel: true,
        store: {
          select: { id: true, name: true, slug: true },
        },
        template: {
          select: { id: true, name: true, kind: true },
        },
        providerConfig: {
          select: { id: true, name: true, providerKey: true },
        },
        audiences: {
          orderBy: { createdAt: 'asc' },
        },
        schedules: {
          orderBy: { createdAt: 'desc' },
        },
        logs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async sendCampaignNow(
    id: string,
    actorId: string,
    actorRole: string,
    effectiveStoreId: string | null,
  ) {
    const campaign = await this.prisma.messageCampaign.findFirst({
      where: {
        id,
        ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
      },
      include: {
        schedules: {
          where: {
            status: MessageScheduleStatus.PENDING,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (
      campaign.status === MessageCampaignStatus.PROCESSING ||
      campaign.status === MessageCampaignStatus.COMPLETED
    ) {
      throw new BadRequestException('Campaign da duoc xu ly');
    }

    if (campaign.schedules.length > 0) {
      await this.prisma.messageSchedule.updateMany({
        where: {
          campaignId: campaign.id,
          status: MessageScheduleStatus.PENDING,
        },
        data: {
          status: MessageScheduleStatus.CANCELLED,
          lastError: 'Triggered manually before scheduled time',
        },
      });
    }

    await this.prisma.messageCampaign.update({
      where: { id: campaign.id },
      data: {
        status: MessageCampaignStatus.READY,
        scheduledAt: null,
      },
    });

    const dispatch = await this.dispatchCampaign(campaign.id, effectiveStoreId);

    await this.createAuditLog({
      actorId,
      actorRole,
      storeId: campaign.storeId,
      action: 'MESSAGE_CAMPAIGN_SEND_NOW',
      entityType: 'message_campaign',
      entityId: campaign.id,
      payload: {
        name: campaign.name,
        previousStatus: campaign.status,
        dispatchStatus: dispatch.status,
      },
    });

    return dispatch;
  }

  async listSchedules(effectiveStoreId: string | null, query: ListMessageSchedulesDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const runAt =
      query.runFrom || query.runTo
        ? {
            ...(query.runFrom ? { gte: new Date(query.runFrom) } : {}),
            ...(query.runTo ? { lte: new Date(query.runTo) } : {}),
          }
        : undefined;
    const where: Prisma.MessageScheduleWhereInput = {
      ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(runAt ? { runAt } : {}),
      ...(query.channelCode
        ? {
            channel: {
              code: query.channelCode,
            },
          }
        : {}),
      ...(query.search
        ? {
            campaign: {
              is: {
                name: {
                  contains: query.search,
                },
              },
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.messageSchedule.findMany({
        where,
        include: {
          channel: true,
          campaign: {
            select: { id: true, name: true, status: true },
          },
          providerConfig: {
            select: { id: true, name: true, providerKey: true },
          },
        },
        orderBy: { runAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.messageSchedule.count({ where }),
    ]);

    return this.paginate(items, total, page, limit);
  }

  async updateSchedule(
    id: string,
    actorId: string,
    actorRole: string,
    effectiveStoreId: string | null,
    dto: UpdateMessageScheduleDto,
  ) {
    const schedule = await this.prisma.messageSchedule.findFirst({
      where: {
        id,
        ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
      },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (schedule.status !== MessageScheduleStatus.PENDING) {
      throw new BadRequestException('Chi cho phep sua lich dang pending');
    }

    const runAt = new Date(dto.runAt);
    if (runAt.getTime() <= Date.now()) {
      throw new BadRequestException('Thoi gian gui phai lon hon hien tai');
    }

    if (!schedule.campaignId) {
      throw new BadRequestException('Schedule khong gan voi campaign');
    }

    const [updatedSchedule] = await this.prisma.$transaction([
      this.prisma.messageSchedule.update({
        where: { id },
        data: {
          runAt,
          lastError: null,
        },
      }),
      this.prisma.messageCampaign.update({
        where: { id: schedule.campaignId },
        data: {
          status: MessageCampaignStatus.SCHEDULED,
          scheduledAt: runAt,
        },
      }),
    ]);

    await this.createAuditLog({
      actorId,
      actorRole,
      storeId: schedule.storeId,
      action: 'MESSAGE_SCHEDULE_UPDATED',
      entityType: 'message_schedule',
      entityId: updatedSchedule.id,
      payload: {
        previousRunAt: schedule.runAt.toISOString(),
        runAt: updatedSchedule.runAt.toISOString(),
        campaignId: schedule.campaignId,
      },
    });

    return updatedSchedule;
  }

  async cancelSchedule(
    id: string,
    actorId: string,
    actorRole: string,
    effectiveStoreId: string | null,
  ) {
    const schedule = await this.prisma.messageSchedule.findFirst({
      where: {
        id,
        ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
      },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (schedule.status !== MessageScheduleStatus.PENDING) {
      throw new BadRequestException('Chi cho phep huy lich dang pending');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.messageSchedule.update({
        where: { id },
        data: {
          status: MessageScheduleStatus.CANCELLED,
          lastError: 'Cancelled manually',
        },
      });

      if (schedule.campaignId) {
        await tx.messageCampaign.update({
          where: { id: schedule.campaignId },
          data: {
            status: MessageCampaignStatus.CANCELLED,
          },
        });

        await tx.messageAudience.updateMany({
          where: {
            campaignId: schedule.campaignId,
            status: {
              in: ['PENDING', 'QUEUED'],
            },
          },
          data: {
            status: 'SKIPPED',
          },
        });
      }
    });

    await this.createAuditLog({
      actorId,
      actorRole,
      storeId: schedule.storeId,
      action: 'MESSAGE_SCHEDULE_CANCELLED',
      entityType: 'message_schedule',
      entityId: schedule.id,
      payload: {
        campaignId: schedule.campaignId,
      },
    });

    return { success: true };
  }

  async listLogs(effectiveStoreId: string | null, query: ListMessageLogsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const where = this.buildLogWhere(effectiveStoreId, query);

    const [items, total] = await Promise.all([
      this.prisma.messageLog.findMany({
        where,
        include: {
          channel: true,
          campaign: {
            select: { id: true, name: true, status: true },
          },
          template: {
            select: { id: true, name: true },
          },
          createdBy: {
            select: { id: true, name: true, phone: true, email: true },
          },
          user: {
            select: { id: true, name: true, phone: true, email: true },
          },
          order: {
            select: { id: true, orderCode: true, totalAmount: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.messageLog.count({ where }),
    ]);

    return this.paginate(items, total, page, limit);
  }

  async getLogDetail(id: string, effectiveStoreId: string | null) {
    const log = await this.prisma.messageLog.findFirst({
      where: {
        id,
        ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
      },
      include: {
        channel: true,
        store: {
          select: { id: true, name: true, slug: true },
        },
        campaign: {
          select: { id: true, name: true, status: true },
        },
        template: {
          select: { id: true, name: true, kind: true },
        },
        automationRule: {
          select: { id: true, name: true, triggerType: true },
        },
        providerConfig: {
          select: { id: true, name: true, providerKey: true },
        },
        audience: true,
        user: {
          select: { id: true, name: true, phone: true, email: true },
        },
        order: {
          select: { id: true, orderCode: true, totalAmount: true, status: true },
        },
        createdBy: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
    });

    if (!log) {
      throw new NotFoundException('Message log not found');
    }

    return log;
  }

  async retryFailedLog(
    id: string,
    actorId: string,
    actorRole: string,
    effectiveStoreId: string | null,
  ) {
    const log = await this.prisma.messageLog.findFirst({
      where: {
        id,
        ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
      },
      include: {
        channel: true,
      },
    });

    if (!log) {
      throw new NotFoundException('Message log not found');
    }

    if (log.status !== MessageLogStatus.FAILED) {
      throw new BadRequestException('Chi cho phep retry log dang loi');
    }

    const retryLog = await this.messagingService.queueMessage({
      channelCode: log.channel.code,
      recipient: log.recipientValue,
      recipientName: log.recipientName || undefined,
      audienceId: log.audienceId || undefined,
      storeId: log.storeId || undefined,
      userId: log.userId || undefined,
      orderId: log.orderId || undefined,
      campaignId: log.campaignId || undefined,
      templateId: log.templateId || undefined,
      automationRuleId: log.automationRuleId || undefined,
      createdById: actorId,
      providerConfigId: log.providerConfigId || undefined,
      messageContent: log.content,
      templateVariables: this.toPlainObject(log.renderedVariables),
      metadata: this.toJsonValue({
        ...(this.toPlainObject(log.metadata) as Record<string, unknown>),
        retryOfLogId: log.id,
        retryRequestedById: actorId,
        retryRequestedAt: new Date().toISOString(),
      }),
      idempotencyKey: `${log.idempotencyKey || log.id}-retry-${Date.now()}`,
    });

    await this.prisma.messageLog.update({
      where: { id: log.id },
      data: {
        metadata: this.toJsonValue({
          ...(this.toPlainObject(log.metadata) as Record<string, unknown>),
          latestRetryLogId: retryLog.id,
          retriedAt: new Date().toISOString(),
          retriedById: actorId,
        }),
      },
    });

    await this.createAuditLog({
      actorId,
      actorRole,
      storeId: log.storeId,
      action: 'MESSAGE_LOG_RETRIED',
      entityType: 'message_log',
      entityId: log.id,
      payload: {
        retryLogId: retryLog.id,
        previousStatus: log.status,
        retryStatus: retryLog.status,
      },
    });

    return {
      success: true,
      originalLogId: log.id,
      retryLogId: retryLog.id,
      status: retryLog.status,
    };
  }

  async exportLogsCsv(effectiveStoreId: string | null, query: ListMessageLogsDto) {
    const where = this.buildLogWhere(effectiveStoreId, {
      ...query,
      page: 1,
      limit: Math.min(query.limit || 1000, 5000),
    });
    const logs = await this.prisma.messageLog.findMany({
      where,
      include: {
        channel: true,
        campaign: {
          select: { name: true },
        },
        createdBy: {
          select: { name: true },
        },
        order: {
          select: { orderCode: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(query.limit || 1000, 5000),
    });
    const headers = [
      'createdAt',
      'channel',
      'campaign',
      'recipientName',
      'recipientValue',
      'status',
      'providerMessageId',
      'orderCode',
      'createdBy',
      'sentAt',
      'errorCode',
      'errorMessage',
      'content',
    ];
    const rows = logs.map((log) => [
      log.createdAt.toISOString(),
      log.channel.code,
      log.campaign?.name || '',
      log.recipientName || '',
      log.recipientValue,
      log.status,
      log.providerMessageId || '',
      log.order?.orderCode || '',
      log.createdBy?.name || '',
      log.sentAt?.toISOString() || '',
      log.errorCode || '',
      log.errorMessage || '',
      log.content,
    ]);

    return [headers, ...rows]
      .map((row) => row.map((value) => this.escapeCsv(value)).join(','))
      .join('\n');
  }

  async listAutomationRules(effectiveStoreId: string | null) {
    return this.prisma.messageAutomationRule.findMany({
      where: {
        ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
      },
      include: {
        channel: true,
        template: {
          select: { id: true, name: true },
        },
        providerConfig: {
          select: { id: true, name: true, providerKey: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAutomationRuleDetail(id: string, effectiveStoreId: string | null) {
    const rule = await this.prisma.messageAutomationRule.findFirst({
      where: {
        id,
        ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
      },
      include: {
        channel: true,
        template: {
          select: { id: true, name: true, kind: true },
        },
        providerConfig: {
          select: { id: true, name: true, providerKey: true },
        },
        createdBy: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
    });

    if (!rule) {
      throw new NotFoundException('Automation rule not found');
    }

    return rule;
  }

  async listAutomationExecutions(
    ruleId: string,
    effectiveStoreId: string | null,
    query: ListMessageAutomationExecutionsDto,
  ) {
    await this.getAutomationRuleDetail(ruleId, effectiveStoreId);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const where: Prisma.MessageAutomationExecutionWhereInput = {
      automationRuleId: ruleId,
      ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.messageAutomationExecution.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, phone: true, email: true },
          },
          order: {
            select: { id: true, orderCode: true, totalAmount: true, status: true },
          },
          messageLog: {
            select: {
              id: true,
              status: true,
              recipientName: true,
              recipientValue: true,
              sentAt: true,
              errorCode: true,
              errorMessage: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.messageAutomationExecution.count({ where }),
    ]);

    return this.paginate(items, total, page, limit);
  }

  async createAutomationRule(
    actorId: string,
    actorRole: string,
    effectiveStoreId: string | null,
    dto: CreateAutomationRuleDto,
  ) {
    const channel = await this.requireChannel(dto.channelCode);
    const template = dto.templateId
      ? await this.requireScopedTemplate(dto.templateId, channel.id, effectiveStoreId)
      : null;
    const providerConfig = dto.providerConfigId
      ? await this.requireScopedProviderConfig(dto.providerConfigId, channel.id, effectiveStoreId)
      : null;

    const rule = await this.prisma.messageAutomationRule.create({
      data: {
        channelId: channel.id,
        storeId: effectiveStoreId,
        templateId: template?.id,
        providerConfigId: providerConfig?.id,
        createdById: actorId,
        name: dto.name,
        triggerType: dto.triggerType,
        triggerConfig: this.toJsonValue(dto.triggerConfig),
        audienceFilter: this.toJsonValue(dto.audienceFilter),
        metadata: this.toJsonValue(dto.metadata),
        isActive: dto.isActive ?? true,
      },
      include: {
        channel: true,
        template: {
          select: { id: true, name: true },
        },
      },
    });

    await this.createAuditLog({
      actorId,
      actorRole,
      storeId: effectiveStoreId,
      action: 'MESSAGE_AUTOMATION_RULE_CREATED',
      entityType: 'message_automation_rule',
      entityId: rule.id,
      payload: {
        channelCode: dto.channelCode,
        name: rule.name,
        triggerType: rule.triggerType,
        isActive: rule.isActive,
      },
    });

    return rule;
  }

  async updateAutomationRule(
    id: string,
    actorId: string,
    actorRole: string,
    effectiveStoreId: string | null,
    dto: UpdateAutomationRuleDto,
  ) {
    const rule = await this.prisma.messageAutomationRule.findFirst({
      where: {
        id,
        ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
      },
      include: { channel: true },
    });

    if (!rule) {
      throw new NotFoundException('Automation rule not found');
    }

    let channelId = rule.channelId;
    if (dto.channelCode && dto.channelCode !== rule.channel.code) {
      const channel = await this.requireChannel(dto.channelCode);
      channelId = channel.id;
    }

    const template = dto.templateId
      ? await this.requireScopedTemplate(dto.templateId, channelId, effectiveStoreId)
      : dto.templateId === null
        ? null
        : undefined;
    const providerConfig = dto.providerConfigId
      ? await this.requireScopedProviderConfig(dto.providerConfigId, channelId, effectiveStoreId)
      : dto.providerConfigId === null
        ? null
        : undefined;

    const updatedRule = await this.prisma.messageAutomationRule.update({
      where: { id },
      data: {
        channelId,
        name: dto.name,
        triggerType: dto.triggerType,
        templateId: template === undefined ? undefined : template?.id || null,
        providerConfigId: providerConfig === undefined ? undefined : providerConfig?.id || null,
        triggerConfig:
          dto.triggerConfig === undefined ? undefined : this.toJsonValue(dto.triggerConfig),
        audienceFilter:
          dto.audienceFilter === undefined ? undefined : this.toJsonValue(dto.audienceFilter),
        metadata: dto.metadata === undefined ? undefined : this.toJsonValue(dto.metadata),
        isActive: dto.isActive,
      },
      include: {
        channel: true,
        template: {
          select: { id: true, name: true },
        },
      },
    });

    await this.createAuditLog({
      actorId,
      actorRole,
      storeId: updatedRule.storeId,
      action: 'MESSAGE_AUTOMATION_RULE_UPDATED',
      entityType: 'message_automation_rule',
      entityId: updatedRule.id,
      payload: {
        previousChannelCode: rule.channel.code,
        channelCode: updatedRule.channel.code,
        name: updatedRule.name,
        triggerType: updatedRule.triggerType,
        isActive: updatedRule.isActive,
      },
    });

    return updatedRule;
  }

  async deleteAutomationRule(
    id: string,
    actorId: string,
    actorRole: string,
    effectiveStoreId: string | null,
  ) {
    const rule = await this.prisma.messageAutomationRule.findFirst({
      where: {
        id,
        ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
      },
    });

    if (!rule) {
      throw new NotFoundException('Automation rule not found');
    }

    await this.prisma.messageAutomationRule.delete({ where: { id } });

    await this.createAuditLog({
      actorId,
      actorRole,
      storeId: rule.storeId,
      action: 'MESSAGE_AUTOMATION_RULE_DELETED',
      entityType: 'message_automation_rule',
      entityId: rule.id,
      payload: {
        name: rule.name,
        triggerType: rule.triggerType,
      },
    });

    return { success: true };
  }

  async processDueSchedules() {
    const dueSchedules = await this.prisma.messageSchedule.findMany({
      where: {
        status: MessageScheduleStatus.PENDING,
        runAt: {
          lte: new Date(),
        },
      },
      orderBy: { runAt: 'asc' },
      take: 20,
    });

    for (const schedule of dueSchedules) {
      const now = new Date();
      const lock = await this.prisma.messageSchedule.updateMany({
        where: {
          id: schedule.id,
          status: MessageScheduleStatus.PENDING,
        },
        data: {
          status: MessageScheduleStatus.PROCESSING,
          attemptCount: { increment: 1 },
          lastAttemptAt: now,
        },
      });

      if (lock.count === 0) {
        continue;
      }

      try {
        if (!schedule.campaignId) {
          throw new Error('Schedule has no campaignId');
        }

        await this.prisma.messageCampaign.update({
          where: { id: schedule.campaignId },
          data: {
            status: MessageCampaignStatus.READY,
          },
        });

        await this.dispatchCampaign(schedule.campaignId, null);

        await this.prisma.messageSchedule.update({
          where: { id: schedule.id },
          data: {
            status: MessageScheduleStatus.COMPLETED,
            lastError: null,
          },
        });
      } catch (error: any) {
        this.logger.error(`Failed to process message schedule ${schedule.id}: ${error.message}`);
        await this.prisma.messageSchedule.update({
          where: { id: schedule.id },
          data: {
            status: MessageScheduleStatus.FAILED,
            lastError: error.message || 'Schedule processing failed',
          },
        });

        if (schedule.campaignId) {
          await this.prisma.messageCampaign.update({
            where: { id: schedule.campaignId },
            data: {
              status: MessageCampaignStatus.FAILED,
            },
          });
        }
      }
    }

    return { processed: dueSchedules.length };
  }

  async dispatchCampaign(campaignId: string, effectiveStoreId: string | null) {
    const campaign = await this.prisma.messageCampaign.findFirst({
      where: {
        id: campaignId,
        ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
      },
      include: {
        channel: true,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const templateVariables = this.extractTemplateVariables(campaign.metadata);
    const batchSize = this.getDispatchBatchSize();
    const totalAudienceCount = await this.prisma.messageAudience.count({
      where: { campaignId: campaign.id },
    });
    let queuedCount = 0;
    let processedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    while (true) {
      if (await this.isCampaignDispatchStopped(campaign.id)) {
        break;
      }

      const audiences = await this.prisma.messageAudience.findMany({
        where: {
          campaignId: campaign.id,
          status: {
            in: [MessageAudienceStatus.PENDING, MessageAudienceStatus.FAILED],
          },
        },
        orderBy: { createdAt: 'asc' },
        take: batchSize,
      });

      if (audiences.length === 0) {
        break;
      }

      for (const audience of audiences) {
        if (await this.isCampaignDispatchStopped(campaign.id)) {
          break;
        }

        try {
          const messageLog = await this.messagingService.queueMessage({
            channelCode: campaign.channel.code,
            recipient: audience.recipientValue,
            recipientName: audience.recipientName || undefined,
            audienceId: audience.id,
            storeId: audience.storeId || campaign.storeId || undefined,
            userId: audience.userId || undefined,
            orderId: audience.orderId || undefined,
            campaignId: campaign.id,
            templateId: campaign.templateId || undefined,
            providerConfigId: campaign.providerConfigId || undefined,
            createdById: campaign.createdById || undefined,
            messageContent: campaign.messageContent || undefined,
            templateVariables,
            metadata: this.toJsonValue({
              campaignName: campaign.name,
            }),
          });

          const audienceStatus = this.resolveAudienceStatusFromMessageLog(messageLog.status);

          await this.prisma.messageAudience.update({
            where: { id: audience.id },
            data: {
              status: audienceStatus,
            },
          });

          if (audienceStatus === MessageAudienceStatus.PROCESSED) {
            processedCount++;
            continue;
          }

          if (audienceStatus === MessageAudienceStatus.SKIPPED) {
            skippedCount++;
            continue;
          }

          queuedCount++;
        } catch (error: any) {
          failedCount++;
          await this.prisma.messageAudience.update({
            where: { id: audience.id },
            data: {
              status: MessageAudienceStatus.FAILED,
            },
          });

          await this.prisma.messageLog.create({
            data: {
              channelId: campaign.channelId,
              storeId: audience.storeId || campaign.storeId || null,
              campaignId: campaign.id,
              templateId: campaign.templateId || null,
              providerConfigId: campaign.providerConfigId || null,
              audienceId: audience.id,
              userId: audience.userId || null,
              orderId: audience.orderId || null,
              createdById: campaign.createdById || null,
              recipientName: audience.recipientName || null,
              recipientValue: audience.recipientValue,
              content: campaign.messageContent || '',
              renderedVariables: this.toJsonValue(templateVariables),
              status: MessageLogStatus.FAILED,
              errorCode: error.code || 'AUDIENCE_DISPATCH_FAILED',
              errorMessage: error.message || 'Audience dispatch failed',
              metadata: this.toJsonValue({
                campaignName: campaign.name,
              }),
            },
          });
        }
      }
    }

    const pendingAudienceCount = await this.prisma.messageAudience.count({
      where: {
        campaignId: campaign.id,
        status: {
          in: [MessageAudienceStatus.PENDING, MessageAudienceStatus.FAILED],
        },
      },
    });
    const stoppedBySystem = await this.isCampaignDispatchStopped(campaign.id);
    const campaignStatus = stoppedBySystem
      ? MessageCampaignStatus.FAILED
      : pendingAudienceCount > 0 || queuedCount > 0
        ? MessageCampaignStatus.PROCESSING
        : failedCount > 0 && processedCount === 0
          ? MessageCampaignStatus.FAILED
          : MessageCampaignStatus.COMPLETED;

    await this.prisma.messageCampaign.update({
      where: { id: campaign.id },
      data: {
        status: campaignStatus,
        sentAt:
          campaignStatus === MessageCampaignStatus.PROCESSING ||
          campaignStatus === MessageCampaignStatus.COMPLETED ||
          campaignStatus === MessageCampaignStatus.FAILED
            ? campaign.sentAt || new Date()
            : campaign.sentAt,
        completedAt:
          campaignStatus === MessageCampaignStatus.COMPLETED ||
          campaignStatus === MessageCampaignStatus.FAILED
            ? new Date()
            : null,
        metadata: this.toJsonValue({
          ...(this.toPlainObject(campaign.metadata) as Record<string, unknown>),
          audienceCount: totalAudienceCount,
          batchSize,
          queuedCount,
          processedCount,
          failedCount,
          skippedCount,
          pendingAudienceCount,
        }),
      },
    });

    return {
      success: true,
      status: campaignStatus,
      audienceCount: totalAudienceCount,
      queuedCount,
      processedCount,
      failedCount,
      skippedCount,
      pendingAudienceCount,
      batchSize,
    };
  }

  private async createCampaignFromAudienceInputs(
    actorId: string,
    actorRole: string,
    effectiveStoreId: string | null,
    input: {
      channelId: string;
      templateId: string | null;
      providerConfigId: string | null;
      name: string;
      audienceSource: MessageAudienceSource;
      filters: unknown;
      messageContent?: string | null;
      scheduledAt?: string | null;
      metadata?: Record<string, unknown> | null;
    },
    audiences: CampaignAudienceInput[],
  ) {
    const contentSnapshot = input.messageContent;

    if (!contentSnapshot) {
      throw new BadRequestException('Noi dung tin nhan khong duoc de trong');
    }

    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
    const isScheduled = !!scheduledAt && scheduledAt.getTime() > Date.now();
    const campaignStatus = isScheduled
      ? MessageCampaignStatus.SCHEDULED
      : MessageCampaignStatus.READY;
    const sendMode = isScheduled ? MessageSendMode.SCHEDULED : MessageSendMode.IMMEDIATE;
    const templateVariables = this.extractTemplateVariables(
      (input.metadata || null) as Prisma.JsonValue | null,
    );
    const campaignPayload = await this.prisma.$transaction(async (tx) => {
      const campaign = await tx.messageCampaign.create({
        data: {
          channelId: input.channelId,
          storeId: effectiveStoreId,
          templateId: input.templateId,
          providerConfigId: input.providerConfigId,
          createdById: actorId,
          name: input.name,
          audienceSource: input.audienceSource,
          sendMode,
          status: campaignStatus,
          filters: this.toJsonValue(input.filters),
          messageContent: contentSnapshot,
          scheduledAt,
          metadata: this.toJsonValue(input.metadata),
        },
      });

      const createdAudiences = [];
      for (const audience of audiences) {
        const createdAudience = await tx.messageAudience.create({
          data: {
            campaignId: campaign.id,
            channelId: input.channelId,
            storeId: audience.storeId || effectiveStoreId || null,
            userId: audience.userId || null,
            orderId: audience.orderId || null,
            recipientName: audience.recipientName || null,
            recipientValue: audience.recipientValue,
            snapshotData: audience.snapshotData || null,
          },
        });
        createdAudiences.push(createdAudience);
      }

      const schedule = isScheduled
        ? await tx.messageSchedule.create({
            data: {
              channelId: input.channelId,
              storeId: effectiveStoreId,
              campaignId: campaign.id,
              providerConfigId: input.providerConfigId,
              createdById: actorId,
              runAt: scheduledAt!,
              payload: this.toJsonValue({
                templateVariables,
                messageContent: contentSnapshot,
              }),
            },
          })
        : null;

      return {
        campaign,
        audiences: createdAudiences,
        schedule,
      };
    });

    if (isScheduled) {
      await this.createAuditLog({
        actorId,
        actorRole,
        storeId: effectiveStoreId,
        action: 'MESSAGE_CAMPAIGN_SCHEDULED',
        entityType: 'message_campaign',
        entityId: campaignPayload.campaign.id,
        payload: {
          name: campaignPayload.campaign.name,
          audienceCount: campaignPayload.audiences.length,
          scheduleId: campaignPayload.schedule?.id || null,
          scheduledAt: scheduledAt?.toISOString() || null,
        },
      });

      return {
        success: true,
        mode: 'scheduled',
        campaignId: campaignPayload.campaign.id,
        audienceCount: campaignPayload.audiences.length,
        scheduleId: campaignPayload.schedule?.id || null,
      };
    }

    const dispatch = await this.dispatchCampaign(campaignPayload.campaign.id, effectiveStoreId);

    await this.createAuditLog({
      actorId,
      actorRole,
      storeId: effectiveStoreId,
      action: 'MESSAGE_CAMPAIGN_CREATED',
      entityType: 'message_campaign',
      entityId: campaignPayload.campaign.id,
      payload: {
        name: campaignPayload.campaign.name,
        audienceCount: campaignPayload.audiences.length,
        sendMode,
        dispatchStatus: dispatch.status,
      },
    });

    return {
      success: true,
      mode: 'immediate',
      campaignId: campaignPayload.campaign.id,
      audienceCount: campaignPayload.audiences.length,
      dispatch,
    };
  }

  private normalizeImportedRecipients(
    recipients: ImportedMessageRecipientDto[],
    effectiveStoreId: string | null,
  ) {
    const uniqueRecipients = new Map<string, CampaignAudienceInput>();

    for (const recipient of recipients) {
      const recipientValue = recipient.recipientValue.trim();

      if (!recipientValue) {
        continue;
      }

      const dedupeKey = recipientValue.toLowerCase();

      if (uniqueRecipients.has(dedupeKey)) {
        continue;
      }

      uniqueRecipients.set(dedupeKey, {
        storeId: effectiveStoreId || null,
        userId: recipient.userId?.trim() || null,
        orderId: recipient.orderId?.trim() || null,
        recipientName: recipient.recipientName?.trim() || null,
        recipientValue,
        snapshotData: this.toJsonValue({
          source: 'IMPORT',
          ...(recipient.metadata || {}),
        }),
      });
    }

    return Array.from(uniqueRecipients.values());
  }

  private ensureCanSchedule(
    actorRole: string,
    staffPermissions: string[],
    scheduledAt?: string | null,
  ) {
    if (!scheduledAt) {
      return;
    }

    const scheduledDate = new Date(scheduledAt);
    if (Number.isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
      return;
    }

    if (actorRole === 'ADMIN' || actorRole === 'MODERATOR') {
      return;
    }

    if (
      this.hasAnyPermission(staffPermissions, [
        Permission.MESSAGING_SCHEDULE,
        Permission.MESSAGING_MANAGE,
      ])
    ) {
      return;
    }

    throw new ForbiddenException('Staff does not have scheduling permission');
  }

  private hasAnyPermission(userPermissions: string[], required: Permission[]) {
    return required.some((permission) => userPermissions.includes(permission));
  }

  private async createAuditLog(input: {
    actorId?: string | null;
    actorRole?: string | null;
    storeId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    payload?: Record<string, unknown> | null;
  }) {
    await this.prisma.messageAuditLog.create({
      data: {
        actorId: input.actorId || null,
        actorRole: input.actorRole || null,
        storeId: input.storeId || null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId || null,
        payload: this.toJsonValue(input.payload || null),
      },
    });
  }

  private resolveAudienceStatusFromMessageLog(status: MessageLogStatus): MessageAudienceStatus {
    if (
      status === MessageLogStatus.SENT ||
      status === MessageLogStatus.DELIVERED ||
      status === MessageLogStatus.READ
    ) {
      return MessageAudienceStatus.PROCESSED;
    }

    if (status === MessageLogStatus.SKIPPED) {
      return MessageAudienceStatus.SKIPPED;
    }

    return MessageAudienceStatus.QUEUED;
  }

  private async isCampaignDispatchStopped(campaignId: string) {
    const campaign = await this.prisma.messageCampaign.findUnique({
      where: { id: campaignId },
      select: { status: true },
    });

    if (!campaign) {
      return false;
    }

    return (
      campaign.status === MessageCampaignStatus.CANCELLED ||
      campaign.status === MessageCampaignStatus.FAILED
    );
  }

  private getDispatchBatchSize() {
    return Math.max(Number(process.env.MESSAGING_DISPATCH_BATCH_SIZE || 100), 1);
  }

  private async requireChannel(channelCode: MessageChannelCode) {
    const channel = await this.prisma.messageChannel.findUnique({
      where: { code: channelCode },
    });

    if (!channel) {
      throw new NotFoundException(`Channel ${channelCode} not found`);
    }

    if (!channel.isActive) {
      throw new BadRequestException(`Channel ${channelCode} is not active`);
    }

    return channel;
  }

  private async requireScopedTemplate(
    templateId: string,
    channelId: string,
    effectiveStoreId: string | null,
  ) {
    const template = await this.prisma.messageTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (template.channelId !== channelId) {
      throw new BadRequestException('Template does not belong to the selected channel');
    }

    this.ensureTemplateReadScope(template.storeId, effectiveStoreId);
    return template;
  }

  private async requireScopedProviderConfig(
    providerConfigId: string,
    channelId: string,
    effectiveStoreId: string | null,
  ) {
    const providerConfig = await this.prisma.messageProviderConfig.findUnique({
      where: { id: providerConfigId },
    });

    if (!providerConfig) {
      throw new NotFoundException('Provider config not found');
    }

    if (providerConfig.channelId !== channelId) {
      throw new BadRequestException('Provider config does not belong to the selected channel');
    }

    if (effectiveStoreId && providerConfig.storeId && providerConfig.storeId !== effectiveStoreId) {
      throw new ForbiddenException('Provider config does not belong to current store scope');
    }

    return providerConfig;
  }

  private buildTemplateListWhere(
    effectiveStoreId: string | null,
    query: ListMessageTemplatesDto,
  ): Prisma.MessageTemplateWhereInput {
    const andConditions: Prisma.MessageTemplateWhereInput[] = [];

    if (effectiveStoreId) {
      andConditions.push({
        OR: [{ storeId: effectiveStoreId }, { storeId: null }],
      });
    }

    if (query.search) {
      andConditions.push({
        OR: [{ name: { contains: query.search } }, { content: { contains: query.search } }],
      });
    }

    return {
      ...(query.channelCode
        ? {
            channel: {
              code: query.channelCode,
            },
          }
        : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(andConditions.length ? { AND: andConditions } : {}),
    };
  }

  private buildLogWhere(
    effectiveStoreId: string | null,
    query: ListMessageLogsDto,
  ): Prisma.MessageLogWhereInput {
    const createdAt: Prisma.DateTimeFilter | undefined =
      query.dateFrom || query.dateTo
        ? {
            ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
            ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
          }
        : undefined;

    return {
      ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
      ...(query.channelCode
        ? {
            channel: {
              code: query.channelCode,
            },
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.campaignId ? { campaignId: query.campaignId } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(query.search
        ? {
            OR: [
              { recipientName: { contains: query.search } },
              { recipientValue: { contains: query.search } },
              { content: { contains: query.search } },
              {
                campaign: {
                  is: {
                    name: { contains: query.search },
                  },
                },
              },
            ],
          }
        : {}),
    };
  }

  private resolveScopedStoreId(
    actorRole: string,
    effectiveStoreId: string | null,
    requestedStoreId?: string,
  ) {
    if (effectiveStoreId) {
      if (requestedStoreId && requestedStoreId !== effectiveStoreId) {
        throw new ForbiddenException('Store scope mismatch');
      }

      return effectiveStoreId;
    }

    if (actorRole !== 'ADMIN') {
      return effectiveStoreId;
    }

    return requestedStoreId || null;
  }

  private ensureTemplateReadScope(storeId: string | null, effectiveStoreId: string | null) {
    if (!effectiveStoreId) {
      return;
    }

    if (storeId && storeId !== effectiveStoreId) {
      throw new ForbiddenException('Template does not belong to current store scope');
    }
  }

  private ensureTemplateWriteScope(storeId: string | null, effectiveStoreId: string | null) {
    if (!effectiveStoreId) {
      return;
    }

    if (storeId !== effectiveStoreId) {
      throw new ForbiddenException('Template does not belong to current store scope');
    }
  }

  private extractTemplateVariables(metadata: Prisma.JsonValue | null) {
    const plainObject = this.toPlainObject(metadata);
    const value = plainObject.templateVariables;
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private escapeCsv(value: unknown) {
    const stringValue = value === null || value === undefined ? '' : String(value);
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  private paginate<T>(items: T[], total: number, page: number, limit: number) {
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    if (value === undefined) {
      return null;
    }

    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private toPlainObject(value: Prisma.JsonValue | null) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {} as Record<string, unknown>;
    }

    return value as Record<string, unknown>;
  }

  private getString(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
  }

  private getNumber(value: unknown) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private maskSensitiveValue(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }
    if (trimmed.length <= 4) {
      return '****';
    }
    return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
  }
}
