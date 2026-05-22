import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import {
  MessageAudienceStatus,
  MessageCampaignStatus,
  MessageChannelCode,
  MessageLog,
  MessageLogStatus,
  MessageScheduleStatus,
  Prisma,
} from '@prisma/client';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  MESSAGE_DEAD_LETTER_QUEUE,
  MESSAGE_DISPATCH_JOB,
  MESSAGE_DISPATCH_QUEUE,
} from './messaging.constants';
import { MessagingProviderRegistryService } from './messaging-provider-registry.service';
import { MessagingRendererService } from './messaging-renderer.service';
import { MessagingValidatorService } from './messaging-validator.service';
import { MessageDispatchJobData, PreviewMessageInput, QueueMessageInput } from './messaging.types';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: MessagingProviderRegistryService,
    private readonly renderer: MessagingRendererService,
    private readonly validator: MessagingValidatorService,
    @Optional()
    @Inject(getQueueToken(MESSAGE_DISPATCH_QUEUE))
    private readonly dispatchQueue?: Queue,
    @Optional()
    @Inject(getQueueToken(MESSAGE_DEAD_LETTER_QUEUE))
    private readonly deadLetterQueue?: Queue,
  ) {}

  async previewMessage(input: PreviewMessageInput) {
    const preparedMessage = await this.prepareMessage(input);

    return {
      channelCode: input.channelCode,
      templateId: preparedMessage.template?.id || null,
      providerConfigId: preparedMessage.providerConfig?.id || null,
      recipient: preparedMessage.recipientValidation?.normalizedRecipient || null,
      recipientValid: preparedMessage.recipientValidation?.isValid ?? true,
      recipientError: preparedMessage.recipientValidation?.errorMessage || null,
      content: preparedMessage.renderedContent.content,
      renderedVariables: preparedMessage.renderedContent.renderedVariables,
      unresolvedVariables: preparedMessage.renderedContent.unresolvedVariables,
      isValid: preparedMessage.renderedContent.unresolvedVariables.length === 0,
    };
  }

  async queueMessage(input: QueueMessageInput): Promise<MessageLog> {
    const preparedMessage = await this.prepareMessage(input);
    const { channel, template, providerConfig, recipientValidation, renderedContent } =
      preparedMessage;

    this.validator.validatePayload(input.channelCode, recipientValidation!, renderedContent);

    const recipientValue = recipientValidation?.normalizedRecipient || '';

    const idempotencyKey =
      input.idempotencyKey ||
      this.createIdempotencyKey({
        channelCode: input.channelCode,
        recipient: recipientValue,
        templateId: template?.id,
        content: renderedContent.content,
        campaignId: input.campaignId,
        automationRuleId: input.automationRuleId,
        storeId: input.storeId,
        userId: input.userId,
        orderId: input.orderId,
        variables: renderedContent.renderedVariables,
      });

    const activeOptOut = await this.findActiveOptOut(channel.id, recipientValue);
    const baseMetadata = this.mergeJsonObjects(input.metadata, {
      source: 'messaging-core',
      channelCode: input.channelCode,
    });

    if (activeOptOut) {
      const { messageLog } = await this.createMessageLog({
        input,
        channelId: channel.id,
        templateId: template?.id,
        providerConfigId: providerConfig?.id,
        idempotencyKey,
        recipientValue,
        content: renderedContent.content,
        renderedVariables: renderedContent.renderedVariables,
        metadata: this.mergeJsonObjects(baseMetadata, {
          skippedReason: 'RECIPIENT_OPTED_OUT',
          optOutId: activeOptOut.id,
          optOutSource: activeOptOut.source,
        }),
        status: MessageLogStatus.SKIPPED,
        queuedAt: new Date(),
        errorCode: 'RECIPIENT_OPTED_OUT',
        errorMessage: 'Recipient opted out',
      });

      return messageLog;
    }

    const { messageLog, deduplicated } = await this.createMessageLog({
      input,
      channelId: channel.id,
      templateId: template?.id,
      providerConfigId: providerConfig?.id,
      idempotencyKey,
      recipientValue,
      content: renderedContent.content,
      renderedVariables: renderedContent.renderedVariables,
      metadata: baseMetadata,
      status: MessageLogStatus.QUEUED,
      queuedAt: new Date(),
    });

    if (deduplicated || messageLog.status !== MessageLogStatus.QUEUED) {
      return messageLog;
    }

    const jobData: MessageDispatchJobData = {
      messageLogId: messageLog.id,
      idempotencyKey,
    };

    if (!this.dispatchQueue) {
      return (await this.processDispatchJob(jobData, 1, this.getAttemptLimit())) || messageLog;
    }

    try {
      const delay = await this.calculateDispatchDelay();
      await this.dispatchQueue.add(MESSAGE_DISPATCH_JOB, jobData, {
        jobId: idempotencyKey,
        delay,
      });

      return messageLog;
    } catch (error) {
      this.logger.warn(`Queue unavailable for ${messageLog.id}, fallback to inline dispatch`);
      return (await this.processDispatchJob(jobData, 1, this.getAttemptLimit())) || messageLog;
    }
  }

  private async prepareMessage(input: PreviewMessageInput) {
    const channel = await this.prisma.messageChannel.findUnique({
      where: { code: input.channelCode },
    });

    if (!channel) {
      throw new NotFoundException(`Channel ${input.channelCode} does not exist`);
    }

    if (!channel.isActive) {
      throw new BadRequestException(`Channel ${input.channelCode} is not active`);
    }

    const provider = this.providerRegistry.getProvider(input.channelCode);
    const template = await this.resolveTemplate(input.templateId, channel.id);
    const providerConfig = await this.resolveProviderConfig(
      input.providerConfigId,
      channel.id,
      input.storeId,
    );
    const templateContext = await this.buildTemplateContext(
      input.userId,
      input.orderId,
      input.storeId,
    );
    const mergedVariables = {
      ...templateContext,
      ...(input.templateVariables || {}),
    };
    const content = input.messageContent || template?.content;

    if (!content) {
      throw new BadRequestException('Noi dung tin nhan khong duoc de trong');
    }

    const recipientValidation = input.recipient
      ? await provider.validateRecipient(input.recipient)
      : null;
    const renderedContent = this.renderer.render(content, mergedVariables);

    return {
      channel,
      template,
      providerConfig,
      recipientValidation,
      renderedContent,
    };
  }

  async processDispatchJob(
    jobData: MessageDispatchJobData,
    attemptNumber: number,
    maxAttempts: number,
  ): Promise<MessageLog | null> {
    const messageLog = await this.prisma.messageLog.findUnique({
      where: { id: jobData.messageLogId },
      include: {
        channel: true,
        providerConfig: true,
      },
    });

    if (!messageLog) {
      this.logger.warn(`Message log ${jobData.messageLogId} not found`);
      return null;
    }

    if (
      messageLog.status === MessageLogStatus.SENT ||
      messageLog.status === MessageLogStatus.DELIVERED ||
      messageLog.status === MessageLogStatus.READ
    ) {
      return messageLog;
    }

    const provider = this.providerRegistry.getProvider(messageLog.channel.code);
    const logRecord = messageLog as MessageLog;

    if (await this.isCampaignDispatchStopped(messageLog.campaignId)) {
      return this.prisma.messageLog.update({
        where: { id: messageLog.id },
        data: {
          status: MessageLogStatus.SKIPPED,
          errorCode: 'CAMPAIGN_STOPPED',
          errorMessage: 'Campaign dispatch stopped by system safety control',
          metadata: this.mergeJsonObjects(messageLog.metadata, {
            skippedReason: 'CAMPAIGN_STOPPED',
          }),
        },
      });
    }

    try {
      const sendResult = await provider.send({
        recipient: messageLog.recipientValue,
        content: messageLog.content,
        idempotencyKey: logRecord.idempotencyKey || jobData.idempotencyKey,
        providerConfig: messageLog.providerConfig
          ? {
              id: messageLog.providerConfig.id,
              providerKey: messageLog.providerConfig.providerKey,
              settings: messageLog.providerConfig.settings,
              secretSettings: messageLog.providerConfig.secretSettings,
              metadata: messageLog.providerConfig.metadata,
            }
          : null,
        metadata: messageLog.metadata,
      });

      if (!sendResult.success) {
        throw new Error(sendResult.errorMessage || 'Message dispatch failed');
      }

      return this.prisma.messageLog.update({
        where: { id: messageLog.id },
        data: {
          status: MessageLogStatus.SENT,
          providerMessageId: sendResult.providerMessageId,
          errorCode: null,
          errorMessage: null,
          sentAt: new Date(),
          metadata: this.mergeJsonObjects(messageLog.metadata, {
            dispatchAttempt: attemptNumber,
            lastProviderRequest: this.toJsonValue(sendResult.rawRequest),
            lastProviderResponse: this.toJsonValue(sendResult.rawResponse),
          }),
        },
      });
    } catch (error: any) {
      const updatedLog = await this.prisma.messageLog.update({
        where: { id: messageLog.id },
        data: {
          status: MessageLogStatus.FAILED,
          errorCode: error.code || 'MESSAGE_DISPATCH_FAILED',
          errorMessage: error.message || 'Message dispatch failed',
          metadata: this.mergeJsonObjects(messageLog.metadata, {
            dispatchAttempt: attemptNumber,
            lastProviderRequest: this.toJsonValue(error.rawRequest),
            lastProviderResponse: this.toJsonValue(error.rawResponse),
            lastProviderError: error.message || 'Message dispatch failed',
          }),
        },
      });

      if (attemptNumber >= maxAttempts) {
        await this.enqueueDeadLetter(jobData, updatedLog, error);
      }

      await this.handleCampaignFailure(updatedLog.campaignId);

      throw error;
    }
  }

  private async createMessageLog(params: {
    input: QueueMessageInput;
    channelId: string;
    templateId?: string;
    providerConfigId?: string;
    idempotencyKey: string;
    recipientValue: string;
    content: string;
    renderedVariables: Record<string, string>;
    metadata: Prisma.InputJsonValue | undefined;
    status: MessageLogStatus;
    queuedAt?: Date | null;
    errorCode?: string | null;
    errorMessage?: string | null;
  }): Promise<{ messageLog: MessageLog; deduplicated: boolean }> {
    try {
      const messageLog = await this.prisma.messageLog.create({
        data: {
          idempotencyKey: params.idempotencyKey,
          channelId: params.channelId,
          storeId: params.input.storeId,
          campaignId: params.input.campaignId,
          templateId: params.templateId,
          automationRuleId: params.input.automationRuleId,
          providerConfigId: params.providerConfigId,
          audienceId: params.input.audienceId,
          userId: params.input.userId,
          orderId: params.input.orderId,
          createdById: params.input.createdById,
          recipientName: params.input.recipientName,
          recipientValue: params.recipientValue,
          content: params.content,
          renderedVariables: params.renderedVariables,
          status: params.status,
          queuedAt: params.queuedAt || null,
          errorCode: params.errorCode || null,
          errorMessage: params.errorMessage || null,
          metadata: params.metadata,
        } as Prisma.MessageLogUncheckedCreateInput,
      });

      return {
        messageLog,
        deduplicated: false,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existingLog = await this.prisma.messageLog.findUnique({
          where: {
            idempotencyKey: params.idempotencyKey,
          } as Prisma.MessageLogWhereUniqueInput,
        });

        if (existingLog) {
          return {
            messageLog: existingLog,
            deduplicated: true,
          };
        }
      }

      throw error;
    }
  }

  private async resolveTemplate(templateId?: string, channelId?: string) {
    if (!templateId) {
      return null;
    }

    const template = await this.prisma.messageTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} does not exist`);
    }

    if (!template.isActive) {
      throw new BadRequestException(`Template ${templateId} is not active`);
    }

    if (channelId && template.channelId !== channelId) {
      throw new BadRequestException('Template does not belong to the selected channel');
    }

    return template;
  }

  private async resolveProviderConfig(
    providerConfigId?: string,
    channelId?: string,
    storeId?: string,
  ) {
    if (providerConfigId) {
      const providerConfig = await this.prisma.messageProviderConfig.findUnique({
        where: { id: providerConfigId },
      });

      if (!providerConfig) {
        throw new NotFoundException(`Provider config ${providerConfigId} does not exist`);
      }

      if (!providerConfig.isActive) {
        throw new BadRequestException(`Provider config ${providerConfigId} is not active`);
      }

      return providerConfig;
    }

    if (!channelId) {
      return null;
    }

    const storeScope = storeId ? [{ storeId }, { storeId: null }] : [{ storeId: null }];

    return this.prisma.messageProviderConfig.findFirst({
      where: {
        channelId,
        isActive: true,
        OR: storeScope,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  private async findActiveOptOut(channelId: string, recipientValue: string) {
    if (!recipientValue) {
      return null;
    }

    return this.prisma.messageOptOut.findUnique({
      where: {
        channelId_recipientValue: {
          channelId,
          recipientValue,
        },
      },
    });
  }

  private formatDateTime(value?: Date | null) {
    if (!value) {
      return '';
    }

    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'Asia/Bangkok',
    }).format(value);
  }

  private buildShippingAddress(
    order?: {
      shippingStreet?: string | null;
      shippingWard?: string | null;
      shippingProvince?: string | null;
    } | null,
  ) {
    return [order?.shippingStreet, order?.shippingWard, order?.shippingProvince]
      .filter((value) => !!value)
      .join(', ');
  }

  private async buildTemplateContext(userId?: string, orderId?: string, storeId?: string) {
    const [user, order, store] = await Promise.all([
      userId
        ? this.prisma.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              totalSpent: true,
              rank: true,
            },
          })
        : Promise.resolve(null),
      orderId
        ? this.prisma.order.findUnique({
            where: { id: orderId },
            select: {
              id: true,
              orderCode: true,
              subtotal: true,
              discountAmount: true,
              shippingFee: true,
              totalAmount: true,
              shippingName: true,
              shippingPhone: true,
              shippingStreet: true,
              shippingWard: true,
              shippingProvince: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  totalSpent: true,
                  rank: true,
                },
              },
              store: {
                select: {
                  id: true,
                  name: true,
                },
              },
              items: {
                select: {
                  quantity: true,
                  product: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
              appliedVouchers: {
                select: {
                  discountApplied: true,
                },
              },
            },
          })
        : Promise.resolve(null),
      storeId
        ? this.prisma.store.findUnique({
            where: { id: storeId },
            select: {
              id: true,
              name: true,
            },
          })
        : Promise.resolve(null),
    ]);

    const resolvedUser = user || order?.user || null;
    const resolvedUserId = resolvedUser?.id || userId || order?.user?.id || null;
    const [orderCount, latestOrder] = resolvedUserId
      ? await Promise.all([
          this.prisma.order.count({
            where: {
              userId: resolvedUserId,
            },
          }),
          this.prisma.order.findFirst({
            where: {
              userId: resolvedUserId,
            },
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              createdAt: true,
            },
          }),
        ])
      : [0, null];
    const voucherValue =
      order?.appliedVouchers.reduce((sum, item) => sum + item.discountApplied, 0) ||
      order?.discountAmount ||
      0;
    const shippingAddress = this.buildShippingAddress(order);
    const storeName = order?.store?.name || store?.name || '';
    const productNames = Array.from(
      new Set(
        (order?.items || [])
          .map((item) => item.product?.name?.trim() || '')
          .filter((value) => value.length > 0),
      ),
    );

    return {
      customer_name: resolvedUser?.name || order?.shippingName || '',
      phone: resolvedUser?.phone || order?.shippingPhone || '',
      email: resolvedUser?.email || '',
      order_code: order?.orderCode || '',
      order_amount: order?.totalAmount || 0,
      voucher_value: voucherValue,
      discount_amount: order?.discountAmount || 0,
      shipping_fee: order?.shippingFee || 0,
      subtotal: order?.subtotal || 0,
      total_amount: order?.totalAmount || 0,
      total_spent: user?.totalSpent || order?.user?.totalSpent || 0,
      shipping_name: order?.shippingName || resolvedUser?.name || '',
      shipping_phone: order?.shippingPhone || resolvedUser?.phone || '',
      shipping_address: shippingAddress,
      customer_rank: user?.rank || order?.user?.rank || '',
      order_count: orderCount,
      last_order_date: this.formatDateTime(latestOrder?.createdAt || order?.createdAt || null),
      store_name: storeName,
      product_names: productNames.join(', '),
      product_summary: productNames.join(', '),
    };
  }

  private createIdempotencyKey(input: {
    channelCode: MessageChannelCode;
    recipient?: string;
    templateId?: string;
    content: string;
    campaignId?: string;
    automationRuleId?: string;
    storeId?: string;
    userId?: string;
    orderId?: string;
    variables: Record<string, string>;
  }): string {
    return createHash('sha256')
      .update(
        JSON.stringify({
          channelCode: input.channelCode,
          recipient: input.recipient,
          templateId: input.templateId,
          content: input.content,
          campaignId: input.campaignId,
          automationRuleId: input.automationRuleId,
          storeId: input.storeId,
          userId: input.userId,
          orderId: input.orderId,
          variables: input.variables,
        }),
      )
      .digest('hex');
  }

  private getAttemptLimit(): number {
    return Number(process.env.MESSAGING_QUEUE_ATTEMPTS || 3);
  }

  private async calculateDispatchDelay(): Promise<number> {
    if (!this.dispatchQueue) {
      return 0;
    }

    const rateLimitMax = Number(process.env.MESSAGING_QUEUE_RATE_LIMIT_MAX || 5);
    const rateLimitDuration = Number(process.env.MESSAGING_QUEUE_RATE_LIMIT_DURATION_MS || 1000);

    if (rateLimitMax <= 0 || rateLimitDuration <= 0) {
      return 0;
    }

    const counts = await this.dispatchQueue.getJobCounts(
      'waiting',
      'delayed',
      'active',
      'prioritized',
    );
    const pendingJobs = counts.waiting + counts.delayed + counts.active + counts.prioritized;
    const slotDuration = Math.ceil(rateLimitDuration / rateLimitMax);

    return pendingJobs * slotDuration;
  }

  private async enqueueDeadLetter(
    jobData: MessageDispatchJobData,
    messageLog: MessageLog,
    error: unknown,
  ) {
    if (this.deadLetterQueue) {
      await this.deadLetterQueue.add(
        `${MESSAGE_DISPATCH_JOB}-failed`,
        {
          ...jobData,
          error: this.toJsonValue(error),
        },
        {
          jobId: messageLog.id,
          removeOnComplete: false,
          removeOnFail: false,
        },
      );
    }

    await this.prisma.messageLog.update({
      where: { id: messageLog.id },
      data: {
        metadata: this.mergeJsonObjects(messageLog.metadata, {
          deadLetteredAt: new Date().toISOString(),
        }),
      },
    });
  }

  private async isCampaignDispatchStopped(campaignId?: string | null) {
    if (!campaignId) {
      return false;
    }

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

  private async handleCampaignFailure(campaignId?: string | null) {
    if (!campaignId) {
      return;
    }

    const campaign = await this.prisma.messageCampaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        status: true,
        metadata: true,
      },
    });

    if (
      !campaign ||
      (campaign.status !== MessageCampaignStatus.READY &&
        campaign.status !== MessageCampaignStatus.SCHEDULED &&
        campaign.status !== MessageCampaignStatus.PROCESSING)
    ) {
      return;
    }

    const [failedCount, sentCount, deliveredCount, readCount] = await Promise.all([
      this.prisma.messageLog.count({
        where: {
          campaignId,
          status: MessageLogStatus.FAILED,
        },
      }),
      this.prisma.messageLog.count({
        where: {
          campaignId,
          status: MessageLogStatus.SENT,
        },
      }),
      this.prisma.messageLog.count({
        where: {
          campaignId,
          status: MessageLogStatus.DELIVERED,
        },
      }),
      this.prisma.messageLog.count({
        where: {
          campaignId,
          status: MessageLogStatus.READ,
        },
      }),
    ]);

    const thresholdCount = this.getCampaignFailureStopThresholdCount();
    if (failedCount < thresholdCount) {
      return;
    }

    const attemptedCount = failedCount + sentCount + deliveredCount + readCount;
    const failureRate = attemptedCount > 0 ? failedCount / attemptedCount : 1;
    const thresholdRate = this.getCampaignFailureStopThresholdRate();

    if (failureRate < thresholdRate) {
      return;
    }

    const stopReason = `System stopped campaign after ${failedCount} failed messages`;
    const updateResult = await this.prisma.messageCampaign.updateMany({
      where: {
        id: campaignId,
        status: {
          in: [
            MessageCampaignStatus.READY,
            MessageCampaignStatus.SCHEDULED,
            MessageCampaignStatus.PROCESSING,
          ],
        },
      },
      data: {
        status: MessageCampaignStatus.FAILED,
        completedAt: new Date(),
        metadata: this.mergeJsonObjects(campaign.metadata, {
          dispatchStoppedBySystem: true,
          dispatchStoppedAt: new Date().toISOString(),
          dispatchStopReason: stopReason,
          failedCount,
          attemptedCount,
          failureRate,
        }),
      },
    });

    if (updateResult.count === 0) {
      return;
    }

    await Promise.all([
      this.prisma.messageSchedule.updateMany({
        where: {
          campaignId,
          status: {
            in: [MessageScheduleStatus.PENDING, MessageScheduleStatus.PROCESSING],
          },
        },
        data: {
          status: MessageScheduleStatus.CANCELLED,
          lastError: stopReason,
        },
      }),
      this.prisma.messageAudience.updateMany({
        where: {
          campaignId,
          status: {
            in: [MessageAudienceStatus.PENDING, MessageAudienceStatus.QUEUED],
          },
        },
        data: {
          status: MessageAudienceStatus.SKIPPED,
        },
      }),
    ]);

    this.logger.warn(`${stopReason} for campaign ${campaignId}`);
  }

  private mergeJsonObjects(
    baseValue: Prisma.InputJsonValue | Prisma.JsonValue | undefined,
    patchValue: Record<string, unknown>,
  ): Prisma.InputJsonValue | undefined {
    const baseObject = this.toJsonObject(baseValue);
    const patchObject = this.toJsonObject(patchValue);
    return { ...baseObject, ...patchObject };
  }

  private toJsonObject(value: unknown): Prisma.JsonObject {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    try {
      return JSON.parse(JSON.stringify(value)) as Prisma.JsonObject;
    } catch {
      return {};
    }
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    if (value === undefined) {
      return null;
    }

    try {
      return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    } catch {
      return String(value);
    }
  }

  private getCampaignFailureStopThresholdCount() {
    return Math.max(Number(process.env.MESSAGING_CAMPAIGN_STOP_FAILURE_COUNT || 5), 1);
  }

  private getCampaignFailureStopThresholdRate() {
    const rawValue = Number(process.env.MESSAGING_CAMPAIGN_STOP_FAILURE_RATE || 0.5);
    if (Number.isNaN(rawValue)) {
      return 0.5;
    }

    return Math.min(Math.max(rawValue, 0), 1);
  }
}
