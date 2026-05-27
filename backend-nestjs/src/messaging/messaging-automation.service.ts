import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  MessageAutomationExecutionStatus,
  MessageAutomationTriggerType,
  MessageChannelCode,
  MessageLogStatus,
  MessagePurpose,
  OrderStatus,
  PaymentStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingAudienceRecord, MessagingAudienceService } from './messaging-audience.service';
import { MessagingService } from './messaging.service';
import { AudienceFilterDto, RecipientSourceType } from './dto/send-filtered-campaign.dto';

type AutomationRuleRecord = Prisma.MessageAutomationRuleGetPayload<{
  include: {
    channel: true;
  };
}>;

interface OrderStateChangeInput {
  orderId: string;
  previousStatus: OrderStatus;
  currentStatus: OrderStatus;
  previousPaymentStatus: PaymentStatus;
  currentPaymentStatus: PaymentStatus;
  source: string;
  payload?: Record<string, unknown>;
}

interface AutomationOrderSnapshot {
  id: string;
  orderCode: string;
  storeId: string | null;
  userId: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  shippingName: string | null;
  shippingPhone: string | null;
  metadata: Prisma.JsonValue | null;
}

interface VoucherAutomationSnapshot {
  id: string;
  userId: string;
  voucherId: string;
  status: string;
  isUsed: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  unlockAt: Date | null;
  voucher: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    value: number;
    minOrderValue: number;
    storeId: string | null;
  };
}

const DELIVERED_PAID_TRIGGER_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.PAYMENT_COLLECTED,
  OrderStatus.COMPLETED,
];

const SUCCESSFUL_ORDER_STATUSES: OrderStatus[] = [...DELIVERED_PAID_TRIGGER_STATUSES];

const CANCELLED_TRIGGER_STATUSES: OrderStatus[] = [OrderStatus.CANCELLED, OrderStatus.REFUNDED];

@Injectable()
export class MessagingAutomationService {
  private readonly logger = new Logger(MessagingAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messagingService: MessagingService,
    private readonly audienceService: MessagingAudienceService,
  ) {}

  @Cron('0 0 8 * * *', { timeZone: process.env.APP_TIMEZONE || 'Asia/Bangkok' })
  async processBirthdayRulesCron() {
    try {
      await this.processBirthdayRules();
    } catch (error: any) {
      this.logger.error(`Failed to process birthday automation rules: ${error.message}`);
    }
  }

  @Cron('0 5 8 * * *', { timeZone: process.env.APP_TIMEZONE || 'Asia/Bangkok' })
  async processVoucherLifecycleRulesCron() {
    try {
      await this.processVoucherLifecycleRules();
    } catch (error: any) {
      this.logger.error(`Failed to process voucher lifecycle rules: ${error.message}`);
    }
  }

  @Cron('0 10 8 * * *', { timeZone: process.env.APP_TIMEZONE || 'Asia/Bangkok' })
  async processCustomerInactivityRulesCron() {
    try {
      await this.processCustomerInactivityRules();
    } catch (error: any) {
      this.logger.error(`Failed to process customer inactivity rules: ${error.message}`);
    }
  }

  async processBirthdayRules(now = new Date()) {
    const rules = await this.prisma.messageAutomationRule.findMany({
      where: {
        triggerType: {
          in: [MessageAutomationTriggerType.BIRTHDAY, MessageAutomationTriggerType.BIRTHDAY_TODAY],
        },
        isActive: true,
        channel: {
          isActive: true,
        },
      },
      include: {
        channel: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (rules.length === 0) {
      return { processedRules: 0, queuedRecipients: 0 };
    }

    const birthdayUserIds = await this.findBirthdayUserIds(now);
    const birthdayKey = this.formatDateKey(now);
    let queuedRecipients = 0;

    for (const rule of rules) {
      queuedRecipients += await this.processBirthdayRule(rule, birthdayUserIds, birthdayKey);
      await this.prisma.messageAutomationRule.update({
        where: { id: rule.id },
        data: { lastRunAt: now },
      });
    }

    return {
      processedRules: rules.length,
      queuedRecipients,
    };
  }

  async processVoucherLifecycleRules(now = new Date()) {
    await this.processVoucherReminderRules(MessageAutomationTriggerType.VOUCHER_EXPIRING_3D, now);
    await this.processVoucherExpiredRules(now);
  }

  async processCustomerInactivityRules(now = new Date()) {
    await this.processCustomerInactivityThresholdRules(
      MessageAutomationTriggerType.CUSTOMER_INACTIVE_30D,
      30,
      now,
    );
    await this.processCustomerInactivityThresholdRules(
      MessageAutomationTriggerType.CUSTOMER_INACTIVE_60D,
      60,
      now,
    );
  }

  async handleCustomerCreated(userId: string, source: string, payload?: Record<string, unknown>) {
    await this.processCustomerRules(
      MessageAutomationTriggerType.CUSTOMER_CREATED,
      userId,
      {
        trigger_source: source,
      },
      {
        source,
        payload: payload || {},
      },
      `customer-created:user:${userId}`,
    );
  }

  async handleOrderCreated(orderId: string, source: string, payload?: Record<string, unknown>) {
    const order = await this.getOrderSnapshot(orderId);
    if (!order) {
      return;
    }

    await this.processOrderRules(MessageAutomationTriggerType.ORDER_CREATED, order, {
      orderId,
      previousStatus: order.status,
      currentStatus: order.status,
      previousPaymentStatus: order.paymentStatus,
      currentPaymentStatus: order.paymentStatus,
      source,
      payload,
    });
  }

  async handleVoucherCreated(
    userVoucherId: string,
    source: string,
    payload?: Record<string, unknown>,
  ) {
    await this.processVoucherRules(
      MessageAutomationTriggerType.VOUCHER_CREATED,
      userVoucherId,
      source,
      payload,
    );
  }

  async handleVoucherActivated(
    userVoucherId: string,
    source: string,
    payload?: Record<string, unknown>,
  ) {
    await this.processVoucherRules(
      MessageAutomationTriggerType.VOUCHER_ACTIVATED,
      userVoucherId,
      source,
      payload,
    );
  }

  async handleVoucherUsed(
    userVoucherId: string,
    orderId: string,
    source: string,
    payload?: Record<string, unknown>,
  ) {
    await this.processVoucherRules(
      MessageAutomationTriggerType.VOUCHER_USED,
      userVoucherId,
      source,
      {
        ...(payload || {}),
        orderId,
      },
    );
  }

  async handleOrderStateChange(input: OrderStateChangeInput) {
    const order = await this.getOrderSnapshot(input.orderId);

    if (!order) {
      return;
    }

    if (
      input.previousStatus !== input.currentStatus &&
      input.currentStatus === OrderStatus.CONFIRMED
    ) {
      await this.processOrderRules(MessageAutomationTriggerType.ORDER_CONFIRMED, order, input);
    }

    if (this.didEnterShippingState(input.previousStatus, input.currentStatus)) {
      await this.processOrderRules(
        MessageAutomationTriggerType.ORDER_SHIPPING_STATUS,
        order,
        input,
      );
      await this.processOrderRules(MessageAutomationTriggerType.ORDER_SHIPPED, order, input);
    }

    if (
      input.previousStatus !== input.currentStatus &&
      DELIVERED_PAID_TRIGGER_STATUSES.includes(input.currentStatus)
    ) {
      await this.processOrderRules(MessageAutomationTriggerType.ORDER_DELIVERED, order, input);

      if (this.isPartialOrder(order)) {
        await this.processOrderRules(
          MessageAutomationTriggerType.ORDER_PARTIAL_DELIVERED,
          order,
          input,
        );
      }
    }

    if (
      input.previousStatus !== input.currentStatus &&
      CANCELLED_TRIGGER_STATUSES.includes(input.currentStatus)
    ) {
      await this.processOrderRules(MessageAutomationTriggerType.ORDER_CANCELLED, order, input);

      if (input.currentPaymentStatus !== PaymentStatus.PAID) {
        await this.processOrderRules(MessageAutomationTriggerType.PAYMENT_FAILED, order, input);
      }
    }

    if (
      input.currentPaymentStatus === PaymentStatus.PAID &&
      input.previousPaymentStatus !== PaymentStatus.PAID
    ) {
      await this.processOrderRules(MessageAutomationTriggerType.PAYMENT_SUCCESS, order, input);
    }

    if (
      this.isDeliveredPaidState(input.currentStatus, input.currentPaymentStatus) &&
      !this.isDeliveredPaidState(input.previousStatus, input.previousPaymentStatus)
    ) {
      await this.processOrderRules(MessageAutomationTriggerType.ORDER_DELIVERED_PAID, order, input);
    }
  }

  private async processBirthdayRule(
    rule: AutomationRuleRecord,
    birthdayUserIds: string[],
    birthdayKey: string,
  ) {
    if (birthdayUserIds.length === 0) {
      return 0;
    }

    if (!this.isChannelSupported(rule.channel.code)) {
      return 0;
    }

    const baseFilter = this.parseAudienceFilter(rule.audienceFilter);
    const mergedFilter = this.mergeAudienceFilter(baseFilter, {
      userIds: birthdayUserIds,
      limit: Math.max(baseFilter?.limit || 0, birthdayUserIds.length),
    });
    let audienceRecords: MessagingAudienceRecord[];

    try {
      audienceRecords = await this.audienceService.resolveAudienceRecords(
        rule.channel.code,
        RecipientSourceType.CUSTOMERS,
        mergedFilter,
        rule.storeId,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to resolve birthday audience for rule ${rule.id}: ${error.message}`,
      );
      return 0;
    }

    let queuedRecipients = 0;

    for (const audienceRecord of audienceRecords) {
      if (!audienceRecord.userId) {
        continue;
      }

      const triggerKey = `birthday:${birthdayKey}:user:${audienceRecord.userId}`;
      const execution = await this.reserveExecution({
        automationRuleId: rule.id,
        triggerType: rule.triggerType,
        triggerKey,
        storeId: audienceRecord.storeId || rule.storeId || null,
        userId: audienceRecord.userId,
        orderId: null,
        payload: this.toJsonValue({
          source: 'BIRTHDAY_CRON',
          birthdayKey,
          audienceFilter: mergedFilter,
          recipient: audienceRecord.recipient,
        }),
      });

      if (!execution) {
        continue;
      }

      const queued = await this.dispatchExecution(rule, execution.id, audienceRecord, {
        trigger_source: 'BIRTHDAY_CRON',
        birthday_date: birthdayKey,
      });

      if (queued) {
        queuedRecipients += 1;
      }
    }

    return queuedRecipients;
  }

  private async processOrderRules(
    triggerType: MessageAutomationTriggerType,
    order: AutomationOrderSnapshot,
    input: OrderStateChangeInput,
  ) {
    const rules = await this.prisma.messageAutomationRule.findMany({
      where: {
        triggerType,
        isActive: true,
        channel: {
          isActive: true,
        },
        ...(order.storeId
          ? {
              OR: [{ storeId: order.storeId }, { storeId: null }],
            }
          : {
              storeId: null,
            }),
      },
      include: {
        channel: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (rules.length === 0) {
      return;
    }

    for (const rule of rules) {
      const triggerKey = this.buildOrderTriggerKey(triggerType, order.id);
      const execution = await this.reserveExecution({
        automationRuleId: rule.id,
        triggerType,
        triggerKey,
        storeId: order.storeId,
        userId: order.userId,
        orderId: order.id,
        payload: this.toJsonValue({
          source: input.source,
          orderId: order.id,
          orderCode: order.orderCode,
          previousStatus: input.previousStatus,
          currentStatus: input.currentStatus,
          previousPaymentStatus: input.previousPaymentStatus,
          currentPaymentStatus: input.currentPaymentStatus,
          payload: input.payload || {},
        }),
      });

      if (!execution) {
        continue;
      }

      if (!this.isChannelSupported(rule.channel.code)) {
        await this.completeExecution(execution.id, MessageAutomationExecutionStatus.SKIPPED, {
          reason: 'CHANNEL_NOT_SUPPORTED',
        });
        await this.touchRule(rule.id);
        continue;
      }

      const skipReason = this.getOrderSkipReason(order, rule.triggerConfig);
      if (skipReason) {
        await this.completeExecution(execution.id, MessageAutomationExecutionStatus.SKIPPED, {
          reason: skipReason,
        });
        await this.touchRule(rule.id);
        continue;
      }

      if (!this.matchesAllowedOrderStatuses(rule.triggerConfig, triggerType, order.status)) {
        await this.completeExecution(execution.id, MessageAutomationExecutionStatus.SKIPPED, {
          reason: 'ORDER_STATUS_NOT_ALLOWED',
        });
        await this.touchRule(rule.id);
        continue;
      }

      const mergedFilter = this.mergeAudienceFilter(this.parseAudienceFilter(rule.audienceFilter), {
        orderIds: [order.id],
        limit: 1,
      });
      let audienceRecords: MessagingAudienceRecord[];

      try {
        audienceRecords = await this.audienceService.resolveAudienceRecords(
          rule.channel.code,
          RecipientSourceType.ORDERS,
          mergedFilter,
          rule.storeId || order.storeId || null,
        );
      } catch (error: any) {
        await this.completeExecution(execution.id, MessageAutomationExecutionStatus.FAILED, {
          reason: error.message || 'AUDIENCE_RESOLUTION_FAILED',
        });
        await this.touchRule(rule.id);
        continue;
      }

      if (audienceRecords.length === 0) {
        await this.completeExecution(execution.id, MessageAutomationExecutionStatus.SKIPPED, {
          reason: 'NO_ELIGIBLE_RECIPIENT',
        });
        await this.touchRule(rule.id);
        continue;
      }

      await this.dispatchExecution(rule, execution.id, audienceRecords[0], {
        trigger_source: input.source,
        order_status: order.status,
        payment_status: order.paymentStatus,
        previous_order_status: input.previousStatus,
        previous_payment_status: input.previousPaymentStatus,
      });
      await this.touchRule(rule.id);
    }
  }

  private async processCustomerRules(
    triggerType: MessageAutomationTriggerType,
    userId: string,
    templateVariables: Record<string, unknown>,
    payload: Record<string, unknown>,
    triggerKeyOverride?: string,
  ) {
    const rules = await this.prisma.messageAutomationRule.findMany({
      where: {
        triggerType,
        isActive: true,
        channel: {
          isActive: true,
        },
      },
      include: {
        channel: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    for (const rule of rules) {
      const triggerKey =
        triggerKeyOverride ||
        `${triggerType.toLowerCase()}:user:${userId}:${this.formatDateKey(new Date())}`;
      const execution = await this.reserveExecution({
        automationRuleId: rule.id,
        triggerType,
        triggerKey,
        storeId: rule.storeId || null,
        userId,
        orderId: null,
        payload: this.toJsonValue(payload),
      });

      if (!execution) {
        continue;
      }

      if (!this.isChannelSupported(rule.channel.code)) {
        await this.completeExecution(execution.id, MessageAutomationExecutionStatus.SKIPPED, {
          reason: 'CHANNEL_NOT_SUPPORTED',
        });
        await this.touchRule(rule.id);
        continue;
      }

      const audienceRecords = await this.audienceService.resolveAudienceRecords(
        rule.channel.code,
        RecipientSourceType.CUSTOMERS,
        this.mergeAudienceFilter(this.parseAudienceFilter(rule.audienceFilter), {
          userIds: [userId],
          limit: 1,
        }),
        rule.storeId || null,
      );

      if (audienceRecords.length === 0) {
        await this.completeExecution(execution.id, MessageAutomationExecutionStatus.SKIPPED, {
          reason: 'NO_ELIGIBLE_RECIPIENT',
        });
        await this.touchRule(rule.id);
        continue;
      }

      await this.dispatchExecution(rule, execution.id, audienceRecords[0], templateVariables);
      await this.touchRule(rule.id);
    }
  }

  private async processVoucherRules(
    triggerType: MessageAutomationTriggerType,
    userVoucherId: string,
    source: string,
    payload?: Record<string, unknown>,
  ) {
    const userVoucher = await this.getVoucherSnapshot(userVoucherId);
    if (!userVoucher) {
      return;
    }

    await this.processCustomerRules(
      triggerType,
      userVoucher.userId,
      {
        trigger_source: source,
        voucher_code: userVoucher.voucher.code,
        voucher_name: userVoucher.voucher.name,
        voucher_value: userVoucher.voucher.value,
        voucher_min_order_value: userVoucher.voucher.minOrderValue,
        voucher_expires_at: userVoucher.expiresAt?.toISOString() || null,
      },
      {
        source,
        userVoucherId,
        voucherId: userVoucher.voucherId,
        voucherCode: userVoucher.voucher.code,
        payload: payload || {},
      },
      `${triggerType.toLowerCase()}:user-voucher:${userVoucherId}`,
    );
  }

  private async processVoucherReminderRules(triggerType: MessageAutomationTriggerType, now: Date) {
    const rules = await this.prisma.messageAutomationRule.findMany({
      where: {
        triggerType,
        isActive: true,
        channel: {
          isActive: true,
        },
      },
      include: { channel: true },
      orderBy: { createdAt: 'asc' },
    });

    if (rules.length === 0) {
      return;
    }

    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + 3);
    const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const end = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

    const userVouchers = await this.prisma.userVoucher.findMany({
      where: {
        status: 'ACTIVE',
        isUsed: false,
        expiresAt: {
          gte: start,
          lt: end,
        },
      },
      select: { id: true },
    });

    for (const userVoucher of userVouchers) {
      await this.processVoucherRules(triggerType, userVoucher.id, 'VOUCHER_LIFECYCLE_CRON', {
        lifecycleDate: this.formatDateKey(start),
      });
    }
  }

  private async processVoucherExpiredRules(now: Date) {
    const rules = await this.prisma.messageAutomationRule.findMany({
      where: {
        triggerType: MessageAutomationTriggerType.VOUCHER_EXPIRED,
        isActive: true,
        channel: {
          isActive: true,
        },
      },
      include: { channel: true },
      orderBy: { createdAt: 'asc' },
    });

    const expiringVouchers = await this.prisma.userVoucher.findMany({
      where: {
        status: 'ACTIVE',
        isUsed: false,
        expiresAt: {
          lt: now,
        },
      },
      select: { id: true },
    });

    for (const userVoucher of expiringVouchers) {
      await this.prisma.userVoucher.update({
        where: { id: userVoucher.id },
        data: { status: 'EXPIRED' },
      });

      if (rules.length > 0) {
        await this.processVoucherRules(
          MessageAutomationTriggerType.VOUCHER_EXPIRED,
          userVoucher.id,
          'VOUCHER_LIFECYCLE_CRON',
          { expiredAt: now.toISOString() },
        );
      }
    }
  }

  private async processCustomerInactivityThresholdRules(
    triggerType: MessageAutomationTriggerType,
    inactivityDays: number,
    now: Date,
  ) {
    const rows = await this.prisma.order.groupBy({
      by: ['userId'],
      where: {
        userId: { not: null },
        status: { in: SUCCESSFUL_ORDER_STATUSES },
      },
      _max: {
        createdAt: true,
      },
    });

    for (const row of rows) {
      if (!row.userId || !row._max.createdAt) {
        continue;
      }

      const diffDays = Math.floor(
        (now.getTime() - row._max.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays !== inactivityDays) {
        continue;
      }

      await this.processCustomerRules(
        triggerType,
        row.userId,
        {
          inactivity_days: inactivityDays,
          last_successful_order_at: row._max.createdAt.toISOString(),
        },
        {
          source: 'CUSTOMER_INACTIVITY_CRON',
          inactivityDays,
          lastSuccessfulOrderAt: row._max.createdAt.toISOString(),
        },
        `${triggerType.toLowerCase()}:user:${row.userId}:${this.formatDateKey(now)}`,
      );
    }
  }

  private async dispatchExecution(
    rule: AutomationRuleRecord,
    executionId: string,
    audienceRecord: MessagingAudienceRecord,
    templateVariables: Record<string, unknown>,
  ) {
    const messageContent = this.extractMessageContent(rule.metadata);

    if (!rule.templateId && !messageContent) {
      await this.completeExecution(executionId, MessageAutomationExecutionStatus.FAILED, {
        reason: 'AUTOMATION_RULE_HAS_NO_TEMPLATE_OR_CONTENT',
        userId: audienceRecord.userId,
        orderId: audienceRecord.orderId,
        storeId: audienceRecord.storeId || rule.storeId || null,
      });
      return false;
    }

    try {
      const messageLog = await this.messagingService.queueMessage({
        channelCode: rule.channel.code as MessageChannelCode,
        purpose: MessagePurpose.TRANSACTIONAL,
        recipient: audienceRecord.recipient,
        recipientName: audienceRecord.recipientName,
        storeId: audienceRecord.storeId || rule.storeId || undefined,
        userId: audienceRecord.userId,
        orderId: audienceRecord.orderId,
        automationRuleId: rule.id,
        templateId: rule.templateId || undefined,
        providerConfigId: rule.providerConfigId || undefined,
        messageContent: messageContent || undefined,
        templateVariables,
        metadata: this.toJsonValue({
          source: 'messaging-automation',
          triggerType: rule.triggerType,
          executionId,
          templateVariables,
        }),
      });

      await this.completeExecution(executionId, this.mapMessageLogStatus(messageLog.status), {
        messageLogId: messageLog.id,
        userId: audienceRecord.userId,
        orderId: audienceRecord.orderId,
        storeId: audienceRecord.storeId || rule.storeId || null,
        reason: null,
      });

      return true;
    } catch (error: any) {
      await this.completeExecution(executionId, MessageAutomationExecutionStatus.FAILED, {
        reason: error.message || 'AUTOMATION_DISPATCH_FAILED',
        userId: audienceRecord.userId,
        orderId: audienceRecord.orderId,
        storeId: audienceRecord.storeId || rule.storeId || null,
      });
      this.logger.error(`Failed to dispatch automation execution ${executionId}: ${error.message}`);
      return false;
    }
  }

  private async reserveExecution(input: {
    automationRuleId: string;
    triggerType: MessageAutomationTriggerType;
    triggerKey: string;
    storeId: string | null;
    userId: string | null;
    orderId: string | null;
    payload: Prisma.InputJsonValue;
  }) {
    const uniqueWhere = {
      automationRuleId_triggerKey: {
        automationRuleId: input.automationRuleId,
        triggerKey: input.triggerKey,
      },
    };

    try {
      return await this.prisma.messageAutomationExecution.create({
        data: {
          automationRuleId: input.automationRuleId,
          triggerType: input.triggerType,
          triggerKey: input.triggerKey,
          storeId: input.storeId,
          userId: input.userId,
          orderId: input.orderId,
          payload: input.payload,
        },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }

      const existing = await this.prisma.messageAutomationExecution.findUnique({
        where: uniqueWhere,
      });

      if (!existing || existing.status !== MessageAutomationExecutionStatus.FAILED) {
        return null;
      }

      return this.prisma.messageAutomationExecution.update({
        where: { id: existing.id },
        data: {
          triggerType: input.triggerType,
          storeId: input.storeId,
          userId: input.userId,
          orderId: input.orderId,
          payload: input.payload,
          status: MessageAutomationExecutionStatus.PENDING,
          reason: null,
          messageLogId: null,
          executedAt: null,
        },
      });
    }
  }

  private async completeExecution(
    executionId: string,
    status: MessageAutomationExecutionStatus,
    data: {
      reason?: string | null;
      messageLogId?: string | null;
      storeId?: string | null;
      userId?: string | null;
      orderId?: string | null;
    },
  ) {
    return this.prisma.messageAutomationExecution.update({
      where: { id: executionId },
      data: {
        status,
        reason: data.reason === undefined ? undefined : data.reason,
        messageLogId: data.messageLogId === undefined ? undefined : data.messageLogId,
        storeId: data.storeId === undefined ? undefined : data.storeId,
        userId: data.userId === undefined ? undefined : data.userId,
        orderId: data.orderId === undefined ? undefined : data.orderId,
        executedAt: new Date(),
      },
    });
  }

  private mapMessageLogStatus(status: MessageLogStatus) {
    if (
      status === MessageLogStatus.SENT ||
      status === MessageLogStatus.DELIVERED ||
      status === MessageLogStatus.READ
    ) {
      return MessageAutomationExecutionStatus.SENT;
    }

    if (status === MessageLogStatus.FAILED) {
      return MessageAutomationExecutionStatus.FAILED;
    }

    if (status === MessageLogStatus.SKIPPED) {
      return MessageAutomationExecutionStatus.SKIPPED;
    }

    return MessageAutomationExecutionStatus.QUEUED;
  }

  private async findBirthdayUserIds(now: Date) {
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM users
      WHERE role = ${Role.CUSTOMER}
        AND is_active = true
        AND dob IS NOT NULL
        AND MONTH(dob) = ${month}
        AND DAY(dob) = ${day}
    `;

    return rows.map((row) => row.id);
  }

  private async getOrderSnapshot(orderId: string): Promise<AutomationOrderSnapshot | null> {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderCode: true,
        storeId: true,
        userId: true,
        status: true,
        paymentStatus: true,
        shippingName: true,
        shippingPhone: true,
        metadata: true,
      },
    });
  }

  private async getVoucherSnapshot(
    userVoucherId: string,
  ): Promise<VoucherAutomationSnapshot | null> {
    return this.prisma.userVoucher.findUnique({
      where: { id: userVoucherId },
      select: {
        id: true,
        userId: true,
        voucherId: true,
        status: true,
        isUsed: true,
        expiresAt: true,
        createdAt: true,
        unlockAt: true,
        voucher: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            value: true,
            minOrderValue: true,
            storeId: true,
          },
        },
      },
    });
  }

  private didEnterShippingState(previousStatus: OrderStatus, currentStatus: OrderStatus) {
    return previousStatus !== OrderStatus.SHIPPED && currentStatus === OrderStatus.SHIPPED;
  }

  private isDeliveredPaidState(status: OrderStatus, paymentStatus: PaymentStatus) {
    return (
      DELIVERED_PAID_TRIGGER_STATUSES.includes(status) &&
      (paymentStatus === PaymentStatus.PAID || status === OrderStatus.PAYMENT_COLLECTED)
    );
  }

  private matchesAllowedOrderStatuses(
    triggerConfig: Prisma.JsonValue | null,
    triggerType: MessageAutomationTriggerType,
    orderStatus: OrderStatus,
  ) {
    const plainConfig = this.toPlainObject(triggerConfig);
    const rawStatuses = Array.isArray(plainConfig.allowedOrderStatuses)
      ? plainConfig.allowedOrderStatuses.filter(
          (value): value is OrderStatus =>
            typeof value === 'string' && Object.values(OrderStatus).includes(value as OrderStatus),
        )
      : [];

    if (rawStatuses.length > 0) {
      return rawStatuses.includes(orderStatus);
    }

    if (triggerType === MessageAutomationTriggerType.ORDER_SHIPPING_STATUS) {
      return orderStatus === OrderStatus.SHIPPED;
    }

    return DELIVERED_PAID_TRIGGER_STATUSES.includes(orderStatus);
  }

  private getOrderSkipReason(
    order: AutomationOrderSnapshot,
    triggerConfig: Prisma.JsonValue | null,
  ) {
    const plainConfig = this.toPlainObject(triggerConfig);
    const skipPartialOrders = plainConfig.skipPartialOrders !== false;
    const skipExchangeOrders = plainConfig.skipExchangeOrders !== false;

    if (skipExchangeOrders && this.isExchangeOrder(order)) {
      return 'SKIP_EXCHANGE_ORDER';
    }

    if (skipPartialOrders && this.isPartialOrder(order)) {
      return 'SKIP_PARTIAL_ORDER';
    }

    return null;
  }

  private isExchangeOrder(order: AutomationOrderSnapshot) {
    if (order.status === OrderStatus.EXCHANGING) {
      return true;
    }

    const metadata = this.toPlainObject(order.metadata);
    return this.matchesKeyword(
      [
        metadata.exchangeType,
        metadata.orderType,
        metadata.isExchangeOrder,
        metadata.exchangeOrder,
        metadata?.source?.orderType,
        ...(Array.isArray(metadata.tags) ? metadata.tags : []),
      ],
      ['exchange', 'doi', 'đổi'],
    );
  }

  private isPartialOrder(order: AutomationOrderSnapshot) {
    const metadata = this.toPlainObject(order.metadata);
    return this.matchesKeyword(
      [
        metadata.partialOrder,
        metadata.isPartialOrder,
        metadata.partialDelivery,
        metadata.isPartialDelivery,
        metadata.orderType,
        metadata?.partner?.partialDelivery,
        metadata?.partner?.deliveryType,
        metadata?.partner?.deliveryStatus,
        metadata?.source?.orderType,
        ...(Array.isArray(metadata.tags) ? metadata.tags : []),
      ],
      ['partial', 'mot phan', 'một phần'],
    );
  }

  private matchesKeyword(values: unknown[], keywords: string[]) {
    return values.some((value) => {
      if (typeof value === 'boolean') {
        return value;
      }

      if (typeof value !== 'string') {
        return false;
      }

      const normalized = value.toLowerCase();
      return keywords.some((keyword) => normalized.includes(keyword));
    });
  }

  private parseAudienceFilter(value: Prisma.JsonValue | null) {
    const plainObject = this.toPlainObject(value);
    if (Object.keys(plainObject).length === 0) {
      return undefined;
    }

    return plainObject as AudienceFilterDto;
  }

  private mergeAudienceFilter(
    baseFilter: AudienceFilterDto | undefined,
    overrideFilter: Partial<AudienceFilterDto>,
  ): AudienceFilterDto {
    return {
      ...(baseFilter || {}),
      ...overrideFilter,
      userIds: this.mergeStringList(baseFilter?.userIds, overrideFilter.userIds),
      orderIds: this.mergeStringList(baseFilter?.orderIds, overrideFilter.orderIds),
    };
  }

  private mergeStringList(baseValues?: string[], overrideValues?: string[]) {
    if (!baseValues?.length) {
      return overrideValues;
    }

    if (!overrideValues?.length) {
      return baseValues;
    }

    return Array.from(new Set([...baseValues, ...overrideValues]));
  }

  private extractMessageContent(metadata: Prisma.JsonValue | null) {
    const plainObject = this.toPlainObject(metadata);
    return typeof plainObject.messageContent === 'string' ? plainObject.messageContent : null;
  }

  private buildOrderTriggerKey(triggerType: MessageAutomationTriggerType, orderId: string) {
    const triggerMap: Partial<Record<MessageAutomationTriggerType, string>> = {
      [MessageAutomationTriggerType.ORDER_SHIPPING_STATUS]: 'order-shipping',
      [MessageAutomationTriggerType.ORDER_DELIVERED_PAID]: 'order-delivered-paid',
      [MessageAutomationTriggerType.ORDER_CREATED]: 'order-created',
      [MessageAutomationTriggerType.ORDER_CONFIRMED]: 'order-confirmed',
      [MessageAutomationTriggerType.ORDER_SHIPPED]: 'order-shipped',
      [MessageAutomationTriggerType.ORDER_DELIVERED]: 'order-delivered',
      [MessageAutomationTriggerType.ORDER_PARTIAL_DELIVERED]: 'order-partial-delivered',
      [MessageAutomationTriggerType.ORDER_CANCELLED]: 'order-cancelled',
      [MessageAutomationTriggerType.PAYMENT_SUCCESS]: 'payment-success',
      [MessageAutomationTriggerType.PAYMENT_FAILED]: 'payment-failed',
    };

    return `${triggerMap[triggerType] || 'order-event'}:${orderId}`;
  }

  private isChannelSupported(channelCode: MessageChannelCode) {
    return channelCode === MessageChannelCode.SMS;
  }

  private formatDateKey(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private async touchRule(ruleId: string) {
    await this.prisma.messageAutomationRule.update({
      where: { id: ruleId },
      data: { lastRunAt: new Date() },
    });
  }

  private toPlainObject(value: Prisma.JsonValue | null) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {} as Record<string, any>;
    }

    return value as Record<string, any>;
  }

  private toJsonValue(value: Record<string, unknown>) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
