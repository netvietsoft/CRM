import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CustomerContactIdentityType,
  MessageChannelCode,
  OrderStatus,
  PaymentStatus,
  Prisma,
  Rank,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AudienceFilterDto,
  AudiencePurchaseState,
  RecipientSourceType,
} from './dto/send-filtered-campaign.dto';
import { MessagingProviderRegistryService } from './messaging-provider-registry.service';

const SUCCESSFUL_ORDER_STATUSES = [
  OrderStatus.DELIVERED,
  OrderStatus.PAYMENT_COLLECTED,
  OrderStatus.COMPLETED,
];

const FAILED_ORDER_STATUSES = [
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED,
  OrderStatus.RETURNING,
  OrderStatus.EXCHANGING,
];

interface MessagingAudienceAggregate {
  orderCount: number;
  totalAmount: number;
}

interface MessagingAudienceContactIdentity {
  type: CustomerContactIdentityType;
  value: string;
  isPrimary: boolean;
}

interface MessagingAudienceUserProfile {
  id?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  rank?: Rank | null;
  totalSpent?: number;
  zaloUserId?: string | null;
  fbUserId?: string | null;
  contactIdentities: MessagingAudienceContactIdentity[];
}

export interface MessagingAudienceRecord {
  recipient: string;
  recipientName?: string;
  userId?: string;
  orderId?: string;
  storeId?: string | null;
  snapshotData: Prisma.InputJsonValue;
}

@Injectable()
export class MessagingAudienceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: MessagingProviderRegistryService,
  ) {}

  async resolveAudienceRecords(
    channelCode: MessageChannelCode,
    source: RecipientSourceType,
    filters: AudienceFilterDto | undefined,
    effectiveStoreId: string | null,
  ): Promise<MessagingAudienceRecord[]> {
    if (
      source === RecipientSourceType.ORDERS &&
      filters?.purchaseState === AudiencePurchaseState.NOT_PURCHASED
    ) {
      throw new BadRequestException('Nguon ORDERS khong ho tro loc chua mua');
    }

    if (source === RecipientSourceType.ORDERS) {
      return this.resolveOrderAudienceRecords(channelCode, filters, effectiveStoreId);
    }

    return this.resolveCustomerAudienceRecords(channelCode, filters, effectiveStoreId);
  }

  private async resolveCustomerAudienceRecords(
    channelCode: MessageChannelCode,
    filters: AudienceFilterDto | undefined,
    effectiveStoreId: string | null,
  ): Promise<MessagingAudienceRecord[]> {
    const provider = this.providerRegistry.getProvider(channelCode);
    const limit = filters?.limit || 200;
    const requestedUserCount = filters?.userIds?.length || 0;
    const baseTake = Math.min(Math.max(limit * 5, requestedUserCount), 5000);
    const baseUsers = await this.prisma.user.findMany({
      where: {
        role: Role.CUSTOMER,
        ...(filters?.userIds?.length ? { id: { in: filters.userIds } } : {}),
        ...(filters?.customerRanks?.length ? { rank: { in: filters.customerRanks } } : {}),
        ...(filters?.search
          ? {
              OR: [
                { name: { contains: filters.search } },
                { email: { contains: filters.search } },
                { phone: { contains: filters.search } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        rank: true,
        totalSpent: true,
        zaloUserId: true,
        fbUserId: true,
        contactIdentities: {
          select: {
            type: true,
            value: true,
            isPrimary: true,
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: baseTake,
    });

    const needsOrderAggregate = this.needsOrderAggregate(filters, effectiveStoreId);
    const aggregateMap = new Map<string, MessagingAudienceAggregate>();
    let allowedUserIds: Set<string> | null = null;

    if (needsOrderAggregate && baseUsers.length > 0) {
      const groupedOrders = await this.prisma.order.groupBy({
        by: ['userId'],
        where: {
          userId: {
            in: baseUsers.map((user) => user.id),
          },
          ...this.buildOrderWhere(
            filters,
            effectiveStoreId,
            false,
            filters?.purchaseState === AudiencePurchaseState.NOT_PURCHASED,
          ),
        },
        _count: {
          _all: true,
        },
        _sum: {
          totalAmount: true,
        },
      });

      groupedOrders.forEach((group) => {
        if (!group.userId) {
          return;
        }

        aggregateMap.set(group.userId, {
          orderCount: group._count._all,
          totalAmount: group._sum.totalAmount || 0,
        });
      });

      if (filters?.purchaseState === AudiencePurchaseState.NOT_PURCHASED) {
        allowedUserIds = new Set(
          baseUsers
            .filter((user) => !aggregateMap.has(user.id))
            .filter(() => this.matchesAggregateFilters(0, 0, filters))
            .map((user) => user.id),
        );
      } else {
        allowedUserIds = new Set(
          groupedOrders
            .filter((group) => !!group.userId)
            .filter((group) =>
              this.matchesAggregateFilters(group._count._all, group._sum.totalAmount || 0, filters),
            )
            .map((group) => group.userId!)
            .filter(Boolean),
        );
      }
    }

    const results: MessagingAudienceRecord[] = [];

    for (const user of baseUsers) {
      if (allowedUserIds && !allowedUserIds.has(user.id)) {
        continue;
      }

      if (
        !allowedUserIds &&
        !this.matchesAggregateFilters(0, user.totalSpent, {
          ...filters,
          minOrderCount: undefined,
          maxOrderCount: undefined,
        })
      ) {
        continue;
      }

      const availableChannels = this.resolveAvailableChannelCodes(user);
      const recipientResolution = await this.resolveRecipientForChannel(
        channelCode,
        availableChannels,
        user,
        null,
      );

      if (!recipientResolution) {
        continue;
      }

      const aggregate = aggregateMap.get(user.id);
      const validation = await provider.validateRecipient(recipientResolution.recipient);

      if (!validation.isValid || !validation.normalizedRecipient) {
        continue;
      }

      results.push({
        recipient: validation.normalizedRecipient,
        recipientName: user.name || user.phone || user.email || validation.normalizedRecipient,
        userId: user.id,
        storeId: effectiveStoreId,
        snapshotData: this.toJsonValue({
          userId: user.id,
          customerName: user.name || null,
          phone: user.phone || null,
          email: user.email || null,
          rank: user.rank || null,
          totalSpent: aggregate?.totalAmount ?? user.totalSpent,
          orderCount: aggregate?.orderCount ?? null,
          purchaseState: filters?.purchaseState || null,
          availableChannels,
          selectedChannelCode: channelCode,
          selectedRecipient: validation.normalizedRecipient,
          selectedRecipientSource: recipientResolution.source,
        }),
      });

      if (results.length >= limit) {
        break;
      }
    }

    return results;
  }

  private async resolveOrderAudienceRecords(
    channelCode: MessageChannelCode,
    filters: AudienceFilterDto | undefined,
    effectiveStoreId: string | null,
  ): Promise<MessagingAudienceRecord[]> {
    const provider = this.providerRegistry.getProvider(channelCode);
    const limit = filters?.limit || 200;
    const orders = await this.prisma.order.findMany({
      where: this.buildOrderWhere(filters, effectiveStoreId, true),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            zaloUserId: true,
            fbUserId: true,
            contactIdentities: {
              select: {
                type: true,
                value: true,
                isPrimary: true,
              },
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            },
          },
        },
        appliedVouchers: {
          select: {
            discountApplied: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const results: MessagingAudienceRecord[] = [];

    for (const order of orders) {
      const availableChannels = this.resolveAvailableChannelCodes(order.user, order.shippingPhone);
      const recipientResolution = await this.resolveRecipientForChannel(
        channelCode,
        availableChannels,
        order.user,
        order.shippingPhone,
      );

      if (!recipientResolution) {
        continue;
      }

      const validation = await provider.validateRecipient(recipientResolution.recipient);

      if (!validation.isValid || !validation.normalizedRecipient) {
        continue;
      }

      results.push({
        recipient: validation.normalizedRecipient,
        recipientName:
          order.shippingName ||
          order.user?.name ||
          order.shippingPhone ||
          order.user?.phone ||
          validation.normalizedRecipient,
        userId: order.userId || undefined,
        orderId: order.id,
        storeId: order.storeId || effectiveStoreId,
        snapshotData: this.toJsonValue({
          orderId: order.id,
          orderCode: order.orderCode,
          shippingName: order.shippingName || null,
          shippingPhone: order.shippingPhone || null,
          totalAmount: order.totalAmount,
          discountAmount: order.discountAmount,
          shippingFee: order.shippingFee,
          voucherValue: order.appliedVouchers.reduce(
            (sum, voucher) => sum + voucher.discountApplied,
            0,
          ),
          orderStatus: order.status,
          paymentStatus: order.paymentStatus,
          userId: order.userId || null,
          purchaseState: filters?.purchaseState || null,
          availableChannels,
          selectedChannelCode: channelCode,
          selectedRecipient: validation.normalizedRecipient,
          selectedRecipientSource: recipientResolution.source,
        }),
      });
    }

    return results;
  }

  private needsOrderAggregate(
    filters: AudienceFilterDto | undefined,
    effectiveStoreId: string | null,
  ) {
    return (
      !!effectiveStoreId ||
      !!filters?.purchaseState ||
      !!filters?.purchasedFrom ||
      !!filters?.purchasedTo ||
      filters?.minOrderCount !== undefined ||
      filters?.maxOrderCount !== undefined ||
      filters?.minOrderAmount !== undefined ||
      filters?.maxOrderAmount !== undefined ||
      !!filters?.orderStatuses?.length ||
      !!filters?.paymentStatuses?.length ||
      !!filters?.orderIds?.length ||
      filters?.minTotalSpent !== undefined ||
      filters?.maxTotalSpent !== undefined
    );
  }

  private matchesAggregateFilters(
    orderCount: number,
    totalAmount: number,
    filters: AudienceFilterDto | undefined,
  ) {
    if (filters?.minOrderCount !== undefined && orderCount < filters.minOrderCount) {
      return false;
    }

    if (filters?.maxOrderCount !== undefined && orderCount > filters.maxOrderCount) {
      return false;
    }

    if (filters?.minTotalSpent !== undefined && totalAmount < filters.minTotalSpent) {
      return false;
    }

    if (filters?.maxTotalSpent !== undefined && totalAmount > filters.maxTotalSpent) {
      return false;
    }

    return true;
  }

  private buildOrderWhere(
    filters: AudienceFilterDto | undefined,
    effectiveStoreId: string | null,
    includeSearch: boolean,
    ignorePurchaseState = false,
  ): Prisma.OrderWhereInput {
    return {
      ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
      ...(filters?.orderIds?.length ? { id: { in: filters.orderIds } } : {}),
      ...(filters?.orderStatuses?.length ? { status: { in: filters.orderStatuses } } : {}),
      ...(filters?.paymentStatuses?.length
        ? { paymentStatus: { in: filters.paymentStatuses } }
        : {}),
      ...(!ignorePurchaseState ? this.buildPurchaseStateWhere(filters?.purchaseState) : {}),
      ...(filters?.purchasedFrom || filters?.purchasedTo
        ? {
            createdAt: {
              ...(filters?.purchasedFrom ? { gte: new Date(filters.purchasedFrom) } : {}),
              ...(filters?.purchasedTo ? { lte: new Date(filters.purchasedTo) } : {}),
            },
          }
        : {}),
      ...(filters?.minOrderAmount !== undefined || filters?.maxOrderAmount !== undefined
        ? {
            totalAmount: {
              ...(filters?.minOrderAmount !== undefined ? { gte: filters.minOrderAmount } : {}),
              ...(filters?.maxOrderAmount !== undefined ? { lte: filters.maxOrderAmount } : {}),
            },
          }
        : {}),
      ...(includeSearch && filters?.search
        ? {
            OR: [
              { orderCode: { contains: filters.search } },
              { shippingName: { contains: filters.search } },
              { shippingPhone: { contains: filters.search } },
              {
                user: {
                  is: {
                    OR: [
                      { name: { contains: filters.search } },
                      { phone: { contains: filters.search } },
                      { email: { contains: filters.search } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };
  }

  private buildPurchaseStateWhere(
    purchaseState: AudiencePurchaseState | undefined,
  ): Prisma.OrderWhereInput {
    if (purchaseState === AudiencePurchaseState.PURCHASED_SUCCESS) {
      return {
        status: {
          in: SUCCESSFUL_ORDER_STATUSES,
        },
      };
    }

    if (purchaseState === AudiencePurchaseState.PURCHASED_FAILED) {
      return {
        OR: [
          {
            status: {
              in: FAILED_ORDER_STATUSES,
            },
          },
          {
            paymentStatus: PaymentStatus.REFUNDED,
          },
        ],
      };
    }

    return {};
  }

  private resolveAvailableChannelCodes(
    user: MessagingAudienceUserProfile | null,
    shippingPhone?: string | null,
  ) {
    const availableChannels = new Set<MessageChannelCode>();
    const phoneCandidates = this.getPhoneRecipients(user, shippingPhone);

    if (phoneCandidates.length > 0) {
      availableChannels.add(MessageChannelCode.SMS);
      availableChannels.add(MessageChannelCode.ZALO);
      availableChannels.add(MessageChannelCode.WHATSAPP);
    }

    if (
      this.hasDirectValue(user?.zaloUserId) ||
      this.hasIdentity(user, CustomerContactIdentityType.ZALO_UID)
    ) {
      availableChannels.add(MessageChannelCode.ZALO);
    }

    if (
      this.hasDirectValue(user?.fbUserId) ||
      this.hasIdentity(user, CustomerContactIdentityType.MESSENGER_PSID)
    ) {
      availableChannels.add(MessageChannelCode.MESSENGER);
    }

    if (this.hasIdentity(user, CustomerContactIdentityType.TIKTOK_UID)) {
      availableChannels.add(MessageChannelCode.TIKTOK);
    }

    if (this.hasIdentity(user, CustomerContactIdentityType.SHOPEE_UID)) {
      availableChannels.add(MessageChannelCode.SHOPEE);
    }

    return Array.from(availableChannels);
  }

  private async resolveRecipientForChannel(
    channelCode: MessageChannelCode,
    availableChannels: MessageChannelCode[],
    user: MessagingAudienceUserProfile | null,
    shippingPhone?: string | null,
  ) {
    if (!availableChannels.includes(channelCode)) {
      return null;
    }

    const seen = new Set<string>();

    for (const candidate of this.getChannelRecipientCandidates(channelCode, user, shippingPhone)) {
      const trimmedRecipient = candidate.recipient.trim();

      if (!trimmedRecipient || seen.has(trimmedRecipient)) {
        continue;
      }

      seen.add(trimmedRecipient);
      return {
        recipient: trimmedRecipient,
        source: candidate.source,
      };
    }

    return null;
  }

  private getChannelRecipientCandidates(
    channelCode: MessageChannelCode,
    user: MessagingAudienceUserProfile | null,
    shippingPhone?: string | null,
  ) {
    if (channelCode === MessageChannelCode.SMS) {
      return [
        ...this.getPhoneRecipients(user, shippingPhone).map((recipient, index) => ({
          recipient,
          source: index === 0 && shippingPhone ? 'order.shippingPhone' : 'phone',
        })),
      ];
    }

    if (channelCode === MessageChannelCode.ZALO) {
      return [
        ...this.createDirectCandidates(user?.zaloUserId, 'user.zaloUserId'),
        ...this.getIdentityCandidates(
          user,
          CustomerContactIdentityType.ZALO_UID,
          'contactIdentity.zalo',
        ),
        ...this.getPhoneRecipients(user, shippingPhone).map((recipient, index) => ({
          recipient,
          source: index === 0 && shippingPhone ? 'order.shippingPhone' : 'phone',
        })),
      ];
    }

    if (channelCode === MessageChannelCode.MESSENGER) {
      return [
        ...this.createDirectCandidates(user?.fbUserId, 'user.fbUserId'),
        ...this.getIdentityCandidates(
          user,
          CustomerContactIdentityType.MESSENGER_PSID,
          'contactIdentity.messenger',
        ),
      ];
    }

    if (channelCode === MessageChannelCode.WHATSAPP) {
      return [
        ...this.getIdentityCandidates(
          user,
          CustomerContactIdentityType.WHATSAPP_PHONE,
          'contactIdentity.whatsapp',
        ),
        ...this.getPhoneRecipients(user, shippingPhone).map((recipient, index) => ({
          recipient,
          source: index === 0 && shippingPhone ? 'order.shippingPhone' : 'phone',
        })),
      ];
    }

    if (channelCode === MessageChannelCode.TIKTOK) {
      return this.getIdentityCandidates(
        user,
        CustomerContactIdentityType.TIKTOK_UID,
        'contactIdentity.tiktok',
      );
    }

    if (channelCode === MessageChannelCode.SHOPEE) {
      return this.getIdentityCandidates(
        user,
        CustomerContactIdentityType.SHOPEE_UID,
        'contactIdentity.shopee',
      );
    }

    return [];
  }

  private getPhoneRecipients(
    user: MessagingAudienceUserProfile | null,
    shippingPhone?: string | null,
  ) {
    return this.uniqueRecipients([
      shippingPhone || null,
      user?.phone || null,
      ...this.getIdentityValues(user, [
        CustomerContactIdentityType.PHONE,
        CustomerContactIdentityType.WHATSAPP_PHONE,
      ]),
    ]);
  }

  private getIdentityValues(
    user: MessagingAudienceUserProfile | null,
    types: CustomerContactIdentityType[],
  ) {
    return (user?.contactIdentities || [])
      .filter((identity) => types.includes(identity.type))
      .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary))
      .map((identity) => identity.value);
  }

  private getIdentityCandidates(
    user: MessagingAudienceUserProfile | null,
    type: CustomerContactIdentityType,
    source: string,
  ) {
    return this.getIdentityValues(user, [type]).map((recipient) => ({
      recipient,
      source,
    }));
  }

  private createDirectCandidates(value: string | null | undefined, source: string) {
    return value ? [{ recipient: value, source }] : [];
  }

  private uniqueRecipients(recipients: Array<string | null | undefined>) {
    const seen = new Set<string>();
    const results: string[] = [];

    for (const recipient of recipients) {
      const trimmedRecipient = recipient?.trim();

      if (!trimmedRecipient || seen.has(trimmedRecipient)) {
        continue;
      }

      seen.add(trimmedRecipient);
      results.push(trimmedRecipient);
    }

    return results;
  }

  private hasIdentity(
    user: MessagingAudienceUserProfile | null,
    type: CustomerContactIdentityType,
  ) {
    return (user?.contactIdentities || []).some((identity) => identity.type === type);
  }

  private hasDirectValue(value: string | null | undefined) {
    return !!value?.trim();
  }

  private toJsonValue(value: Record<string, unknown>) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
