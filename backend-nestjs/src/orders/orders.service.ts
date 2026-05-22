import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CommissionsService } from '../commissions/commissions.service';
import { AdminNotificationsService } from '../modules/admin-notifications/admin-notifications.service';
import { MessagingAutomationService } from '../messaging/messaging-automation.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateAdminOrderDto } from './dto/create-admin-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private isExpiringVietqrOrders = false;

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private commissionsService: CommissionsService,
    private adminNotificationsService: AdminNotificationsService,
    private messagingAutomationService: MessagingAutomationService,
  ) {}

  private generateOrderCode(): string {
    const prefix = 'ORD';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }

  private getVoucherDiscountAmount(order: {
    appliedVouchers?: Array<{ discountApplied?: number | null }> | null;
  }): number {
    return (order.appliedVouchers || []).reduce(
      (sum, appliedVoucher) => sum + (Number(appliedVoucher.discountApplied) || 0),
      0,
    );
  }

  private getDisplayShippingFee(order: {
    shippingFee?: number | null;
    metadata?: unknown;
  }): number {
    const orderShippingFee = Number(order.shippingFee) || 0;
    if (orderShippingFee > 0) return orderShippingFee;

    const metadata =
      order.metadata && typeof order.metadata === 'object' && !Array.isArray(order.metadata)
        ? (order.metadata as Record<string, any>)
        : {};

    return Number(metadata.partner?.totalFee) || 0;
  }

  private isVietqrExpiredByMetadata(order: { metadata: any }, now = new Date()): boolean {
    const expiresAt = order.metadata?.vietqr?.expiresAt;
    if (!expiresAt) return false;

    const expiry = new Date(expiresAt);
    if (Number.isNaN(expiry.getTime())) return false;

    return expiry <= now;
  }

  isVietqrExpiryCancellation(order: { status: string; metadata: any }): boolean {
    return (
      order.status === 'CANCELLED' &&
      order.metadata?.vietqr?.expired === true &&
      order.metadata?.vietqr?.cancelledBy === 'VIETQR_EXPIRY_CRON'
    );
  }

  isPaymentExpired(order: {
    paymentMethod: any;
    paymentStatus: string;
    status: string;
    metadata: any;
  }): boolean {
    return (
      order.paymentMethod === 'VIETQR' &&
      order.paymentStatus !== 'PAID' &&
      (this.isVietqrExpiryCancellation(order) || this.isVietqrExpiredByMetadata(order))
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async expireVietqrOrdersCron() {
    if (this.isExpiringVietqrOrders) {
      this.logger.warn('Skipping VietQR expiry cron because a previous run is still active.');
      return;
    }

    this.isExpiringVietqrOrders = true;
    try {
      const expiredCount = await this.expireOverdueVietqrOrders();
      if (expiredCount > 0) {
        this.logger.log(`Expired ${expiredCount} overdue VietQR order(s).`);
      }
    } catch (error) {
      this.logger.error(`Failed to expire overdue VietQR orders: ${error.message}`, error.stack);
    } finally {
      this.isExpiringVietqrOrders = false;
    }
  }

  async expireOverdueVietqrOrders(now = new Date()): Promise<number> {
    const candidates = await this.prisma.order.findMany({
      where: {
        paymentMethod: 'VIETQR',
        paymentStatus: 'UNPAID',
        status: 'PENDING',
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    let expiredCount = 0;
    for (const order of candidates) {
      if (!this.isVietqrExpiredByMetadata(order, now)) continue;

      const didExpire = await this.cancelExpiredVietqrOrder(order, now);
      if (didExpire) expiredCount += 1;
    }

    return expiredCount;
  }

  private async cancelExpiredVietqrOrder(
    order: {
      id: string;
      orderCode: string;
      metadata: any;
      items: Array<{
        productId: string;
        quantity: number;
        size: string | null;
        color: string | null;
      }>;
    },
    now: Date,
  ): Promise<boolean> {
    const metadata =
      order.metadata && typeof order.metadata === 'object' && !Array.isArray(order.metadata)
        ? order.metadata
        : {};
    const vietqr = metadata.vietqr && typeof metadata.vietqr === 'object' ? metadata.vietqr : {};

    return this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.order.updateMany({
        where: {
          id: order.id,
          paymentMethod: 'VIETQR',
          paymentStatus: 'UNPAID',
          status: 'PENDING',
        },
        data: {
          status: 'CANCELLED',
          metadata: {
            ...metadata,
            vietqr: {
              ...vietqr,
              expired: true,
              cancelledBy: 'VIETQR_EXPIRY_CRON',
              cancelledAt: now.toISOString(),
            },
          },
        },
      });

      if (updateResult.count === 0) return false;

      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } },
        });

        if (item.size || item.color) {
          const variant = await tx.productVariant.findFirst({
            where: {
              productId: item.productId,
              ...(item.size ? { size: { name: item.size } } : {}),
              ...(item.color ? { color: { name: item.color } } : {}),
            },
            select: { id: true },
          });

          if (variant) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
      }

      this.logger.log(`Cancelled expired VietQR order ${order.orderCode} and restored stock.`);
      return true;
    });
  }

  private normalizeCustomerGender(value?: string | null): 'MALE' | 'FEMALE' | 'OTHER' | null {
    if (value === 'MALE' || value === 'FEMALE' || value === 'OTHER') {
      return value;
    }

    return null;
  }

  private buildCustomerAddress(
    street?: string | null,
    ward?: string | null,
    province?: string | null,
  ): string | null {
    const value = [street, ward, province].filter(Boolean).join(', ').trim();
    return value || null;
  }

  private async generateUniqueReferralCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    while (true) {
      let code = '';
      for (let i = 0; i < 8; i += 1) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const existing = await this.prisma.user.findUnique({
        where: { referralCode: code },
      });

      if (!existing) {
        return code;
      }
    }
  }

  private async resolveAdminOrderCustomer(input: {
    userId?: string;
    name?: string;
    phone?: string;
    email?: string;
    gender?: string;
    dob?: string;
    addressStreet?: string;
    addressWard?: string;
    addressProvince?: string;
  }) {
    const name = input.name?.trim() || null;
    const phone = input.phone?.trim() || null;
    const email = input.email?.trim().toLowerCase() || null;
    const gender = this.normalizeCustomerGender(input.gender);
    const dob = input.dob?.trim() || null;
    const addressStreet = input.addressStreet?.trim() || null;
    const addressWard = input.addressWard?.trim() || null;
    const addressProvince = input.addressProvince?.trim() || null;
    const customerSelect = {
      id: true,
      role: true,
      name: true,
      phone: true,
      email: true,
      gender: true,
      dob: true,
      addressStreet: true,
      addressWard: true,
      addressProvince: true,
    } as const;

    const existingUser = input.userId
      ? await this.prisma.user.findUnique({
          where: { id: input.userId },
          select: customerSelect,
        })
      : null;

    if (input.userId && (!existingUser || existingUser.role !== 'CUSTOMER')) {
      throw new NotFoundException('Customer not found');
    }

    const identityFilters = [phone ? { phone } : null, email ? { email } : null].filter(
      Boolean,
    ) as Array<{ phone: string } | { email: string }>;

    const identityMatches = identityFilters.length
      ? await this.prisma.user.findMany({
          where: {
            OR: identityFilters,
            ...(existingUser ? { id: { not: existingUser.id } } : {}),
          },
          select: {
            id: true,
            role: true,
            phone: true,
            email: true,
          },
        })
      : [];

    const phoneConflict = phone ? identityMatches.find((user) => user.phone === phone) : null;
    const emailConflict = email ? identityMatches.find((user) => user.email === email) : null;

    if (phoneConflict && phoneConflict.role !== 'CUSTOMER') {
      throw new BadRequestException('Số điện thoại đã được sử dụng bởi tài khoản khác');
    }

    if (emailConflict && emailConflict.role !== 'CUSTOMER') {
      throw new BadRequestException('Email đã được sử dụng bởi tài khoản khác');
    }

    if (existingUser) {
      if (phoneConflict) {
        throw new BadRequestException('Số điện thoại đã được sử dụng bởi khách hàng khác');
      }

      if (emailConflict) {
        throw new BadRequestException('Email đã được sử dụng bởi khách hàng khác');
      }

      const nextAddressStreet = addressStreet || existingUser.addressStreet || null;
      const nextAddressWard = addressWard || existingUser.addressWard || null;
      const nextAddressProvince = addressProvince || existingUser.addressProvince || null;

      return this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: name || existingUser.name || null,
          phone: phone || existingUser.phone || null,
          email: email || existingUser.email || null,
          gender: gender || existingUser.gender || null,
          dob: dob ? new Date(dob) : existingUser.dob || null,
          address: this.buildCustomerAddress(
            nextAddressStreet,
            nextAddressWard,
            nextAddressProvince,
          ),
          addressStreet: nextAddressStreet,
          addressWard: nextAddressWard,
          addressProvince: nextAddressProvince,
        },
        select: customerSelect,
      });
    }

    if (phoneConflict && emailConflict && phoneConflict.id !== emailConflict.id) {
      throw new BadRequestException(
        'Số điện thoại và email đang thuộc về hai khách hàng khác nhau',
      );
    }

    const matchedCustomerId = phoneConflict?.id || emailConflict?.id;

    if (matchedCustomerId) {
      const matchedCustomer = await this.prisma.user.findUnique({
        where: { id: matchedCustomerId },
        select: customerSelect,
      });

      if (!matchedCustomer || matchedCustomer.role !== 'CUSTOMER') {
        throw new NotFoundException('Customer not found');
      }

      const nextAddressStreet = addressStreet || matchedCustomer.addressStreet || null;
      const nextAddressWard = addressWard || matchedCustomer.addressWard || null;
      const nextAddressProvince = addressProvince || matchedCustomer.addressProvince || null;

      return this.prisma.user.update({
        where: { id: matchedCustomer.id },
        data: {
          name: name || matchedCustomer.name || null,
          phone: phone || matchedCustomer.phone || null,
          email: email || matchedCustomer.email || null,
          gender: gender || matchedCustomer.gender || null,
          dob: dob ? new Date(dob) : matchedCustomer.dob || null,
          address: this.buildCustomerAddress(
            nextAddressStreet,
            nextAddressWard,
            nextAddressProvince,
          ),
          addressStreet: nextAddressStreet,
          addressWard: nextAddressWard,
          addressProvince: nextAddressProvince,
          onboardingComplete: true,
        },
        select: customerSelect,
      });
    }

    if (!name || !phone) {
      return null;
    }

    return this.prisma.user.create({
      data: {
        role: 'CUSTOMER',
        name,
        phone,
        email,
        gender,
        dob: dob ? new Date(dob) : null,
        address: this.buildCustomerAddress(addressStreet, addressWard, addressProvince),
        addressStreet,
        addressWard,
        addressProvince,
        onboardingComplete: true,
        referralCode: await this.generateUniqueReferralCode(),
      },
      select: customerSelect,
    });
  }

  async create(userId: string, createOrderDto: CreateOrderDto) {
    const {
      items,
      cartItemIds,
      paymentMethod,
      name,
      phone,
      addressStreet,
      addressWard,
      addressProvince,
      note,
      voucherId,
      voucherIds,
      useCommissionPoints = false,
      appliedCommissionPoints,
      shippingFee: clientShippingFee = 0,
    } = createOrderDto;

    if (!items || items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let subtotal = 0;
    let orderStoreId: string | null | undefined;
    const orderItemsToCreate = [];

    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
        include: { variants: { include: { size: true, color: true } } },
      });

      if (!product || !product.isActive) {
        throw new BadRequestException(`Product unavailable`);
      }

      const currentStoreId = product.storeId || null;
      if (orderStoreId === undefined) {
        orderStoreId = currentStoreId;
      } else if (orderStoreId !== currentStoreId) {
        throw new BadRequestException('Cannot mix products from different stores in one order');
      }

      let itemPrice = product.salePrice ?? product.originalPrice;

      if (item.size || item.color) {
        let matchingVariant = null;
        if (item.size && item.color) {
          matchingVariant = product.variants.find(
            (v: any) => v.size?.name === item.size && v.color?.name === item.color,
          );
        } else if (item.size) {
          matchingVariant = product.variants.find((v: any) => v.size?.name === item.size);
        } else if (item.color) {
          matchingVariant = product.variants.find((v: any) => v.color?.name === item.color);
        }

        if (matchingVariant) {
          if (matchingVariant.price !== null && matchingVariant.price !== undefined) {
            itemPrice = matchingVariant.price;
          }

          await this.prisma.productVariant.update({
            where: { id: matchingVariant.id },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      await this.prisma.product.update({
        where: { id: product.id },
        data: { stockQuantity: { decrement: item.quantity } },
      });

      subtotal += itemPrice * item.quantity;
      orderItemsToCreate.push({
        productId: product.id,
        quantity: item.quantity,
        price: itemPrice,
        size: item.size || null,
        color: item.color || null,
      });
    }

    let discountAmount = 0;
    const appliedUserVoucherIds: string[] = [];

    const resolvedVoucherIds =
      voucherIds && voucherIds.length > 0 ? voucherIds : voucherId ? [voucherId] : [];

    for (const currentVoucherId of resolvedVoucherIds) {
      const now = new Date();
      const targetVoucher = await this.prisma.voucher.findUnique({
        where: { id: currentVoucherId },
        include: {
          _count: {
            select: { userVouchers: true },
          },
        },
      });

      const isVoucherInDateRange =
        targetVoucher &&
        (!targetVoucher.validFrom || targetVoucher.validFrom <= now) &&
        (!targetVoucher.validTo || targetVoucher.validTo > now);
      const hasVoucherStock =
        targetVoucher &&
        (targetVoucher.totalUsageLimit === null ||
          targetVoucher._count.userVouchers < targetVoucher.totalUsageLimit);
      const isVoucherForOrderStore =
        targetVoucher &&
        (!targetVoucher.storeId || targetVoucher.storeId === (orderStoreId || null));

      if (
        targetVoucher &&
        targetVoucher.isActive &&
        isVoucherInDateRange &&
        hasVoucherStock &&
        isVoucherForOrderStore
      ) {
        if (targetVoucher.code.startsWith('QR-ORDER-')) {
          let resolvedStatus = (targetVoucher as any).status || 'AUTO';
          if (resolvedStatus === 'AUTO') {
            const orderCode = targetVoucher.code.replace('QR-ORDER-', '');
            const sourceOrder = await this.prisma.order.findUnique({
              where: { orderCode },
              select: { status: true, updatedAt: true },
            });
            if (!sourceOrder) {
              resolvedStatus = 'PENDING';
            } else {
              const isDelivered =
                sourceOrder.status === 'DELIVERED' ||
                sourceOrder.status === 'PAYMENT_COLLECTED' ||
                sourceOrder.status === 'COMPLETED';
              if (isDelivered && sourceOrder.updatedAt) {
                const deliveredDate = new Date(sourceOrder.updatedAt);
                const diffTime = Math.abs(now.getTime() - deliveredDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays >= 7) {
                  resolvedStatus = 'ACTIVE';
                } else {
                  resolvedStatus = 'PENDING';
                }
              } else if (
                sourceOrder.status === 'CANCELLED' ||
                sourceOrder.status === 'REFUNDED' ||
                sourceOrder.status === 'RETURNING'
              ) {
                resolvedStatus = 'LOCKED';
              } else {
                resolvedStatus = 'PENDING';
              }
            }
          }

          if (resolvedStatus !== 'ACTIVE') {
            throw new BadRequestException('Voucher chưa đủ điều kiện sử dụng hoặc đã bị tạm khoá.');
          }
        }

        const userUsedCount = await this.prisma.userVoucher.count({
          where: { userId, voucherId: currentVoucherId, isUsed: true },
        });

        if (
          userUsedCount < targetVoucher.perCustomerLimit &&
          subtotal >= targetVoucher.minOrderValue
        ) {
          let voucherDiscount = 0;

          if (targetVoucher.type === 'STACK') {
            const distinctProductCount = new Set(items.map((i) => i.productId)).size;
            const tiers = (targetVoucher as any).stackTiers as Array<{
              minProducts?: number;
              minAmount?: number;
              conditionType?: string;
              discount: number;
              type?: string;
              maxDiscount?: number;
            }> | null;

            if (tiers && Array.isArray(tiers) && tiers.length > 0) {
              const sortedTiers = [...tiers].sort((a, b) => {
                const aVal = a.conditionType === 'amount' ? a.minAmount || 0 : a.minProducts || 0;
                const bVal = b.conditionType === 'amount' ? b.minAmount || 0 : b.minProducts || 0;
                return bVal - aVal;
              });

              const matchedTier = sortedTiers.find((t) => {
                if (t.conditionType === 'amount') {
                  return subtotal >= (t.minAmount || 0);
                }
                return distinctProductCount >= (t.minProducts || 0);
              });

              if (matchedTier) {
                if (matchedTier.type === 'PERCENT') {
                  voucherDiscount = subtotal * (matchedTier.discount / 100);
                  if (matchedTier.maxDiscount && voucherDiscount > matchedTier.maxDiscount) {
                    voucherDiscount = matchedTier.maxDiscount;
                  }
                } else {
                  voucherDiscount = matchedTier.discount;
                }
              }
            }
          } else if (targetVoucher.type === 'PERCENT') {
            voucherDiscount = subtotal * (targetVoucher.value / 100);
          } else {
            voucherDiscount = targetVoucher.value;
          }

          if (targetVoucher.maxDiscount && voucherDiscount > targetVoucher.maxDiscount) {
            voucherDiscount = targetVoucher.maxDiscount;
          }

          if (voucherDiscount > subtotal) {
            voucherDiscount = subtotal;
          }

          discountAmount += voucherDiscount;

          const existingUserVoucher = await this.prisma.userVoucher.findFirst({
            where: {
              userId,
              voucherId: targetVoucher.id,
              isUsed: false,
              status: { notIn: ['PENDING', 'REJECTED'] },
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
            orderBy: { createdAt: 'asc' },
          });

          if (existingUserVoucher) {
            const usedVoucher = await this.prisma.userVoucher.update({
              where: { id: existingUserVoucher.id },
              data: {
                isUsed: true,
                usedAt: now,
              },
            });
            appliedUserVoucherIds.push(usedVoucher.id);
          } else {
            const newlyClaimed = await this.prisma.userVoucher.create({
              data: {
                userId,
                voucherId: targetVoucher.id,
                isUsed: true,
                usedAt: now,
              },
            });
            appliedUserVoucherIds.push(newlyClaimed.id);
          }

          await this.prisma.voucher.update({
            where: { id: targetVoucher.id },
            data: { usedCount: { increment: 1 } },
          });
        }
      }
    }

    let commissionDiscount = 0;
    if (useCommissionPoints && user.commissionBalance > 0) {
      const maxApplicable = Math.min(
        user.commissionBalance,
        Math.max(0, subtotal - discountAmount),
      );
      const requestedPoints =
        appliedCommissionPoints !== undefined ? appliedCommissionPoints : maxApplicable;
      const actualApplicable = Math.min(requestedPoints, maxApplicable);
      if (actualApplicable > 0) {
        commissionDiscount = actualApplicable;
        discountAmount += commissionDiscount;
        await this.prisma.user.update({
          where: { id: user.id },
          data: { commissionBalance: { decrement: commissionDiscount } },
        });
      }
    }

    const parsedShippingFee = parseFloat(clientShippingFee.toString()) || 0;
    let totalAmount = subtotal - discountAmount + parsedShippingFee;
    if (totalAmount < 0) totalAmount = 0;

    const orderCode = this.generateOrderCode();
    const vietqrExpiresAt =
      paymentMethod === 'VIETQR' ? new Date(Date.now() + 30 * 60 * 1000) : null;
    const vietqrTransactionCode = paymentMethod === 'VIETQR' ? `ORDER:${orderCode}` : null;

    const order = await this.prisma.order.create({
      data: {
        userId: user.id,
        orderCode,
        shippingName: name || user.name,
        shippingPhone: phone || user.phone,
        shippingStreet: addressStreet,
        shippingWard: addressWard,
        shippingProvince: addressProvince,
        subtotal,
        discountAmount,
        shippingFee: parsedShippingFee,
        totalAmount,
        paymentMethod: paymentMethod as any,
        paymentStatus: 'UNPAID',
        note,
        customerNote: note,
        source: 'PORTAL_DIRECT',
        storeId: orderStoreId,
        ...(vietqrExpiresAt && vietqrTransactionCode
          ? {
              metadata: {
                vietqr: {
                  expiresAt: vietqrExpiresAt.toISOString(),
                  transactionCode: vietqrTransactionCode,
                  amount: totalAmount,
                  expired: false,
                },
              },
            }
          : {}),
        items: {
          create: orderItemsToCreate,
        },
        ...(appliedUserVoucherIds.length > 0
          ? {
              appliedVouchers: {
                create: appliedUserVoucherIds.map((uvId) => ({
                  userVoucherId: uvId,
                  discountApplied:
                    (discountAmount - commissionDiscount) / appliedUserVoucherIds.length,
                })),
              },
            }
          : {}),
      },
    });

    if (cartItemIds && Array.isArray(cartItemIds) && cartItemIds.length > 0) {
      await this.prisma.cartItem.deleteMany({
        where: { id: { in: cartItemIds } },
      });
    }

    let vietqrData = null;
    if (paymentMethod === 'VIETQR') {
      const bankId = process.env.VIETQR_BANK_ID || process.env.VIETQR_ACQ_ID || '';
      const accountNo = process.env.VIETQR_ACCOUNT_NO || '';
      const accountName = process.env.VIETQR_ACCOUNT_NAME || '';
      const template = process.env.VIETQR_TEMPLATE || 'compact2';
      const amount = totalAmount;
      const addInfo = vietqrTransactionCode || `ORDER:${order.orderCode}`;

      const qrImageUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(accountName)}`;

      vietqrData = {
        qrImageUrl,
        transactionCode: addInfo,
        amount,
        bankId,
        accountNo,
        accountName,
        expiresAt: (vietqrExpiresAt || new Date(Date.now() + 30 * 60 * 1000)).toISOString(),
      };
    }

    return {
      success: true,
      orderId: order.id,
      orderCode: order.orderCode,
      ...(vietqrData ? { vietqr: vietqrData } : {}),
    };
  }

  async createAdminOrder(params: {
    actorId: string;
    actorRole: string;
    effectiveStoreId?: string | null;
    createOrderDto: CreateAdminOrderDto;
  }) {
    const { actorId, actorRole, effectiveStoreId, createOrderDto } = params;
    const {
      userId,
      items,
      shippingName,
      shippingPhone,
      customerEmail,
      customerGender,
      customerDob,
      shippingStreet,
      shippingWard,
      shippingProvince,
      customerNote,
      adminNote,
      paymentMethod,
      shippingFee = 0,
      discountAmount = 0,
      status,
      metadata: clientMetadata,
    } = createOrderDto;

    if (!items || items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    if (!userId && (!shippingName || !shippingPhone)) {
      throw new BadRequestException('Shipping name and phone are required for guest orders');
    }

    const user = await this.resolveAdminOrderCustomer({
      userId,
      name: shippingName,
      phone: shippingPhone,
      email: customerEmail,
      gender: customerGender,
      dob: customerDob,
      addressStreet: shippingStreet,
      addressWard: shippingWard,
      addressProvince: shippingProvince,
    });

    let orderStoreId: string | null | undefined = effectiveStoreId || undefined;

    if (actorRole !== 'ADMIN' && effectiveStoreId) {
      orderStoreId = effectiveStoreId;
    }

    let subtotal = 0;
    const orderItemsToCreate: Array<{
      productId: string;
      quantity: number;
      price: number;
      size: string | null;
      color: string | null;
    }> = [];

    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
        include: { variants: { include: { size: true, color: true } } },
      });

      if (!product || !product.isActive) {
        throw new BadRequestException('Product unavailable');
      }

      if (actorRole !== 'ADMIN' && effectiveStoreId && product.storeId !== effectiveStoreId) {
        throw new BadRequestException('You can only create orders for your own store');
      }

      const currentStoreId = product.storeId || null;
      if (orderStoreId === undefined) {
        orderStoreId = currentStoreId;
      } else if (orderStoreId !== currentStoreId) {
        throw new BadRequestException('Cannot mix products from different stores in one order');
      }

      let itemPrice = product.salePrice ?? product.originalPrice;

      if (item.size || item.color) {
        const matchingVariant = product.variants.find(
          (variant: any) =>
            (variant.size?.name || null) === (item.size || null) &&
            (variant.color?.name || null) === (item.color || null),
        );

        if (!matchingVariant) {
          throw new BadRequestException(
            `Variant ${item.size || ''} ${item.color || ''} of ${product.name} not found`.trim(),
          );
        }

        if (matchingVariant.price !== null && matchingVariant.price !== undefined) {
          itemPrice = matchingVariant.price;
        }

        await this.prisma.productVariant.update({
          where: { id: matchingVariant.id },
          data: { stock: { decrement: item.quantity } },
        });
      }

      if (item.unitPrice !== undefined && item.unitPrice !== null) {
        itemPrice = item.unitPrice;
      }

      await this.prisma.product.update({
        where: { id: product.id },
        data: { stockQuantity: { decrement: item.quantity } },
      });

      subtotal += itemPrice * item.quantity;
      orderItemsToCreate.push({
        productId: product.id,
        quantity: item.quantity,
        price: itemPrice,
        size: item.size || null,
        color: item.color || null,
      });
    }

    const parsedShippingFee = parseFloat(shippingFee.toString()) || 0;
    const parsedDiscountAmount = Math.max(
      0,
      Math.min(subtotal, parseFloat(discountAmount.toString()) || 0),
    );
    const totalAmount = Math.max(0, subtotal - parsedDiscountAmount + parsedShippingFee);

    const order = await this.prisma.order.create({
      data: {
        userId: user?.id || null,
        orderCode: this.generateOrderCode(),
        status: (status || 'PENDING') as any,
        shippingName: shippingName || user?.name || null,
        shippingPhone: shippingPhone || user?.phone || null,
        shippingStreet: shippingStreet || user?.addressStreet || null,
        shippingWard: shippingWard || user?.addressWard || null,
        shippingProvince: shippingProvince || user?.addressProvince || null,
        subtotal,
        discountAmount: parsedDiscountAmount,
        shippingFee: parsedShippingFee,
        totalAmount,
        paymentMethod: (paymentMethod || 'COD') as any,
        paymentStatus: 'UNPAID',
        note: adminNote || null,
        customerNote: customerNote || null,
        source: 'ADMIN_MANUAL',
        storeId: orderStoreId || null,
        assigningSellerId: clientMetadata?.assigningSellerId || null,
        assigningCareId: clientMetadata?.assigningCareId || null,
        metadata: {
          createdBy: actorId,
          createdByRole: actorRole,
          isGuestOrder: !user?.id,
          ...(clientMetadata || {}),
        },
        items: {
          create: orderItemsToCreate,
        },
      },
    });

    return { success: true, orderId: order.id, orderCode: order.orderCode };
  }

  async updateNote(
    orderId: string,
    body: { note?: string; customerNote?: string },
    userId: string,
    role: string,
    effectiveStoreId?: string | null,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    if (role !== 'ADMIN' && effectiveStoreId && order.storeId !== effectiveStoreId) {
      throw new BadRequestException('You can only update notes for your own store orders');
    }

    const updateData: any = {};
    if (body.note !== undefined) updateData.note = body.note;
    if (body.customerNote !== undefined) updateData.customerNote = body.customerNote;

    await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    return { success: true };
  }

  async updateStaffAssignment(
    orderId: string,
    body: { assigningSellerId?: string | null; assigningCareId?: string | null },
    userId: string,
    role: string,
    effectiveStoreId?: string | null,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    if (role !== 'ADMIN' && effectiveStoreId && order.storeId !== effectiveStoreId) {
      throw new ForbiddenException('You can only update staff for your own store orders');
    }

    const updateData: any = {};
    if (body.assigningSellerId !== undefined) {
      updateData.assigningSellerId = body.assigningSellerId || null;
    }
    if (body.assigningCareId !== undefined) {
      updateData.assigningCareId = body.assigningCareId || null;
    }

    const existingMeta =
      order.metadata && typeof order.metadata === 'object' && !Array.isArray(order.metadata)
        ? (order.metadata as Record<string, any>)
        : {};
    if (body.assigningSellerId !== undefined) {
      existingMeta.assigningSellerId = body.assigningSellerId || null;
    }
    if (body.assigningCareId !== undefined) {
      existingMeta.assigningCareId = body.assigningCareId || null;
    }
    updateData.metadata = existingMeta;

    await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    return { success: true };
  }

  async updateAdminFields(
    orderId: string,
    body: {
      shippingFee?: number;
      discountAmount?: number;
      surcharge?: number;
      transferMoney?: number;
      points?: number;
      reasonValue?: string;
      delayValue?: string;
      tags?: string[];
    },
    userId: string,
    role: string,
    effectiveStoreId?: string | null,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (role !== 'ADMIN' && effectiveStoreId && order.storeId !== effectiveStoreId) {
      throw new ForbiddenException('You can only update orders for your own store');
    }

    const updateData: any = {};

    if (body.shippingFee !== undefined) updateData.shippingFee = body.shippingFee;
    if (body.discountAmount !== undefined) updateData.discountAmount = body.discountAmount;

    if (
      body.shippingFee !== undefined ||
      body.discountAmount !== undefined ||
      body.surcharge !== undefined
    ) {
      const shippingFee = body.shippingFee !== undefined ? body.shippingFee : order.shippingFee;
      const discountAmount =
        body.discountAmount !== undefined ? body.discountAmount : order.discountAmount;

      const existingMeta =
        order.metadata && typeof order.metadata === 'object' && !Array.isArray(order.metadata)
          ? (order.metadata as Record<string, any>)
          : {};
      const surcharge =
        body.surcharge !== undefined ? body.surcharge : existingMeta.financial?.surcharge || 0;

      updateData.totalAmount = Math.max(
        0,
        order.subtotal - discountAmount + shippingFee + surcharge,
      );
    }

    const existingMeta =
      order.metadata && typeof order.metadata === 'object' && !Array.isArray(order.metadata)
        ? (order.metadata as Record<string, any>)
        : {};

    if (body.reasonValue !== undefined) existingMeta.reasonValue = body.reasonValue;
    if (body.delayValue !== undefined) existingMeta.delayValue = body.delayValue;
    if (body.tags !== undefined) existingMeta.tags = body.tags;

    if (body.surcharge !== undefined) {
      if (!existingMeta.financial) existingMeta.financial = {};
      existingMeta.financial.surcharge = body.surcharge;
    }
    if (body.transferMoney !== undefined) {
      if (!existingMeta.payment) existingMeta.payment = {};
      existingMeta.payment.transferMoney = body.transferMoney;
    }
    if (body.points !== undefined) {
      if (!existingMeta.payment) existingMeta.payment = {};
      if (!existingMeta.payment.prepaidByPoint) existingMeta.payment.prepaidByPoint = {};
      existingMeta.payment.prepaidByPoint.point = body.points;
    }

    updateData.metadata = existingMeta;

    await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    return { success: true };
  }

  async findAdminOrders(params: {
    effectiveStoreId?: string | null;
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    paymentMethod?: string;
    dateField?: string;
    dateSort?: string;
    dateFilterType?: string;
    dateValue?: string;
  }) {
    const { effectiveStoreId } = params;
    const page = params.page || 1;
    const limit = params.limit || 11;
    const search = params.search || '';
    const status = params.status;
    const paymentMethod = params.paymentMethod;
    const dateField = params.dateField === 'createdAt' ? 'createdAt' : 'updatedAt';
    const dateSort = params.dateSort === 'asc' ? 'asc' : 'desc';
    const dateFilterType = params.dateFilterType;
    const dateValue = params.dateValue;

    const where: any = {};
    const baseWhere: any = {};

    if (effectiveStoreId) {
      where.storeId = effectiveStoreId;
      baseWhere.storeId = effectiveStoreId;
    }

    if (search) {
      const searchFilter = {
        OR: [
          { orderCode: { contains: search } },
          { shippingName: { contains: search } },
          { shippingPhone: { contains: search } },
          { user: { name: { contains: search } } },
          { user: { phone: { contains: search } } },
        ],
      };
      where.OR = searchFilter.OR;
      baseWhere.OR = searchFilter.OR;
    }

    if (status) where.status = status;
    if (paymentMethod) where.paymentMethod = paymentMethod;

    if (dateFilterType && dateValue) {
      const range = this.getOrderDateRange(dateFilterType, dateValue);
      if (range) {
        where[dateField] = { gte: range.start, lt: range.end };
        baseWhere[dateField] = { gte: range.start, lt: range.end };
      }
    }

    const [orders, total, countsData] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          user: { select: { name: true, rank: true, phone: true } },
          appliedVouchers: {
            include: {
              userVoucher: {
                include: {
                  voucher: { select: { code: true, type: true } },
                },
              },
            },
          },
          items: {
            include: {
              product: { select: { name: true, imageUrl: true } },
            },
          },
          _count: { select: { commissions: true } },
        },
        orderBy: { [dateField]: dateSort },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: true,
      }),
    ]);

    const statusCounts = countsData.reduce(
      (acc, curr) => {
        acc[curr.status] = curr._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statusCounts,
    };
  }

  private getOrderDateRange(filterType: string, value: string): { start: Date; end: Date } | null {
    if (filterType === 'date') {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (!match) return null;

      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      const start = new Date(year, month, day);
      const end = new Date(year, month, day + 1);
      return { start, end };
    }

    if (filterType === 'month') {
      const match = /^(\d{4})-(\d{2})$/.exec(value);
      if (!match) return null;

      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 1);
      return { start, end };
    }

    if (filterType === 'year') {
      const match = /^(\d{4})$/.exec(value);
      if (!match) return null;

      const year = Number(match[1]);
      const start = new Date(year, 0, 1);
      const end = new Date(year + 1, 0, 1);
      return { start, end };
    }

    return null;
  }

  async findAll(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        appliedVouchers: {
          include: {
            userVoucher: {
              include: {
                voucher: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, role: string, effectiveStoreId?: string | null) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        appliedVouchers: {
          include: {
            userVoucher: {
              include: {
                voucher: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            rank: true,
            referrerId: true,
            address: true,
            addressStreet: true,
            addressWard: true,
            addressDistrict: true,
            addressProvince: true,
          },
        },
        commissions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        assigningSeller: {
          select: { id: true, name: true, phone: true },
        },
        assigningCare: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const reviewCount = await this.prisma.review.count({
      where: {
        orderId: order.id,
        userId,
      },
    });

    const metadata =
      order.metadata && typeof order.metadata === 'object' && !Array.isArray(order.metadata)
        ? (order.metadata as Record<string, any>)
        : {};

    const enrichedOrder = {
      ...order,
      hasReview: reviewCount > 0,
      reviewCount,
      reviewRewardGranted: Boolean(metadata.reviewRewardGranted),
      voucherDiscountAmount: this.getVoucherDiscountAmount(order),
    };

    if (role === 'ADMIN') {
      return enrichedOrder;
    }

    if (effectiveStoreId) {
      if (order.storeId === effectiveStoreId) {
        return enrichedOrder;
      }
      throw new NotFoundException('Order not found or access denied');
    }

    if (order.userId === userId) {
      return enrichedOrder;
    }

    throw new NotFoundException('Order not found');
  }

  async updateStatus(
    id: string,
    updateDto: UpdateOrderStatusDto,
    userId?: string,
    role?: string,
    effectiveStoreId?: string | null,
  ) {
    const { status, paymentStatus } = updateDto;

    const currentOrder = await this.findOne(id, userId || '', role || '', effectiveStoreId);

    const updateData: any = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
      if (paymentStatus === 'PAID' && !currentOrder.paidAt) {
        updateData.paidAt = new Date();
      }
    }

    this.logger.log(
      `Updating status for order ${id}: ${currentOrder.status} -> ${status}. Role: ${role}`,
    );

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: updateData,
    });

    if (
      status &&
      status !== currentOrder.status &&
      role &&
      (role === 'ADMIN' || role === 'STAFF' || role === 'MODERATOR')
    ) {
      this.logger.log(`Creating manual update notification for order ${updatedOrder.orderCode}`);
      const statusLabels: Record<string, string> = {
        PENDING: 'Chờ xác nhận',
        WAITING_FOR_GOODS: 'Chờ hàng',
        CONFIRMED: 'Đã xác nhận',
        PACKAGING: 'Đang đóng hàng',
        WAITING_FOR_SHIPPING: 'Chờ vận chuyển',
        SHIPPED: 'Đã gửi hàng',
        DELIVERED: 'Đã nhận',
        PAYMENT_COLLECTED: 'Đã thu tiền',
        RETURNING: 'Đang hoàn',
        EXCHANGING: 'Đang đổi',
        COMPLETED: 'Hoàn thành',
        CANCELLED: 'Đã hủy',
        REFUNDED: 'Hoàn trả',
      };

      const oldLabel = statusLabels[currentOrder.status] || currentOrder.status;
      const newLabel = statusLabels[status] || status;

      await this.adminNotificationsService.createNotification({
        type: 'ORDER',
        title: 'Cập nhật trạng thái thủ công',
        message: `Cập nhật trạng thái thủ công cho đơn hàng ${updatedOrder.orderCode}: thành công từ ${oldLabel} -> ${newLabel}`,
        link: `/admin/orders/${updatedOrder.id}`,
        metadata: {
          orderId: updatedOrder.id,
          orderCode: updatedOrder.orderCode,
          oldStatus: currentOrder.status,
          newStatus: status,
          actorId: userId,
        },
      });
    }

    const isCreditable = status === 'COMPLETED' || status === 'DELIVERED';
    const wasCreditable =
      currentOrder.status === 'COMPLETED' || currentOrder.status === 'DELIVERED';

    if (isCreditable && !wasCreditable) {
      for (const item of currentOrder.items) {
        if (!item.isGift) {
          await this.prisma.product.update({
            where: { id: item.productId },
            data: { soldCount: { increment: item.quantity } },
          });
        }
      }

      if (currentOrder.userId) {
        await this.prisma.user.update({
          where: { id: currentOrder.userId },
          data: { totalSpent: { increment: currentOrder.totalAmount } },
        });
        await this.usersService.updateUserRank(currentOrder.userId);
      }

      if (currentOrder.user && currentOrder.user.referrerId) {
        const existingCommissions = await this.prisma.commissionLedger.findFirst({
          where: {
            orderId: currentOrder.id,
            status: { not: 'CANCELLED' },
          },
        });

        if (!existingCommissions) {
          await this.commissionsService.calculateCommissions(currentOrder);
        }
      }
    }

    const isCancelled = status === 'CANCELLED' || status === 'REFUNDED' || status === 'RETURNED';
    if (isCancelled && wasCreditable) {
      for (const item of currentOrder.items) {
        if (!item.isGift) {
          await this.prisma.product.update({
            where: { id: item.productId },
            data: { soldCount: { decrement: item.quantity } },
          });
        }
      }

      if (currentOrder.userId) {
        await this.prisma.user.update({
          where: { id: currentOrder.userId },
          data: { totalSpent: { decrement: currentOrder.totalAmount } },
        });
        await this.usersService.updateUserRank(currentOrder.userId);
      }

      await this.commissionsService.cancelCommissions(currentOrder.id);
    }

    if (
      (status && status !== currentOrder.status) ||
      (paymentStatus && paymentStatus !== currentOrder.paymentStatus)
    ) {
      await this.messagingAutomationService.handleOrderStateChange({
        orderId: updatedOrder.id,
        previousStatus: currentOrder.status as OrderStatus,
        currentStatus: updatedOrder.status as OrderStatus,
        previousPaymentStatus: currentOrder.paymentStatus as PaymentStatus,
        currentPaymentStatus: updatedOrder.paymentStatus as PaymentStatus,
        source: role === 'CUSTOMER' ? 'ORDER_STATUS_CUSTOMER' : 'ORDER_STATUS_UPDATE',
        payload: {
          actorId: userId || null,
          actorRole: role || null,
        },
      });
    }

    return updatedOrder;
  }

  async customerConfirmReceived(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!order || order.userId !== userId) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    const confirmableStatuses = ['SHIPPED', 'DELIVERED', 'PAYMENT_COLLECTED'];
    if (!confirmableStatuses.includes(order.status)) {
      throw new BadRequestException('Đơn hàng chưa ở trạng thái có thể xác nhận đã nhận');
    }

    return this.updateStatus(
      orderId,
      { status: 'COMPLETED' } as UpdateOrderStatusDto,
      userId,
      'CUSTOMER',
    );
  }

  async markAsRead(id: string, userId?: string, role?: string, effectiveStoreId?: string | null) {
    if (userId && role) {
      await this.findOne(id, userId, role, effectiveStoreId);
    }

    await this.prisma.$executeRaw`UPDATE orders SET is_read = true WHERE id = ${id}`;

    return { success: true };
  }

  async checkStock(productId: string, size: string, color: string, quantity: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Sản phẩm không còn kinh doanh');
    }

    if (size || color) {
      const dbVariant = await this.prisma.productVariant.findFirst({
        where: {
          productId,
          ...(size ? { size: { name: size } } : {}),
          ...(color ? { color: { name: color } } : {}),
        },
      });

      if (!dbVariant || dbVariant.stock < quantity) {
        throw new BadRequestException('Phân loại sản phẩm này đã hết hàng');
      }
    } else {
      if (product.stockQuantity < quantity) {
        throw new BadRequestException('Sản phẩm đã hết hàng hạn mức');
      }
    }

    return { success: true, message: 'Đủ tồn kho' };
  }

  async calculateShippingFee(
    street: string,
    ward: string,
    province: string,
    totalWeight: number,
    storeId?: string,
  ) {
    if (!street || !ward || !province) {
      throw new BadRequestException('Thiếu thông tin địa chỉ');
    }

    const vtpConfig = await this.prisma.storeIntegration.findFirst({
      where: { platform: 'VIETTELPOST', isActive: true },
    });

    const configMetadata = (vtpConfig?.metadata as any) || {};
    const token = vtpConfig?.accessToken || process.env.VIETTELPOST_TOKEN;

    let senderAddress =
      process.env.VIETTELPOST_SENDER_ADDRESS || 'Trần Duy Hưng, Trung Hoà, Cầu Giấy, Hà Nội';

    if (storeId) {
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
        select: {
          addressStreet: true,
          addressWard: true,
          addressDistrict: true,
          addressProvince: true,
        },
      });

      if (store && store.addressProvince && store.addressWard && store.addressStreet) {
        senderAddress = [
          store.addressStreet,
          store.addressWard,
          store.addressDistrict,
          store.addressProvince,
        ]
          .filter(Boolean)
          .join(', ');
      }
    } else if (
      configMetadata.senderProvince &&
      configMetadata.senderWard &&
      configMetadata.senderAddress
    ) {
      senderAddress = `${configMetadata.senderAddress}, ${configMetadata.senderWard}, ${configMetadata.senderProvince}`;
    }

    if (!token) {
      console.warn('Missing VIETTELPOST_TOKEN, returning default shipping fee.');
      return { fee: 30000 };
    }

    const receiverAddress = `${street}, ${ward}, ${province}`;
    const weight = parseInt(totalWeight.toString()) || 500;

    const payload = {
      PRODUCT_WEIGHT: weight,
      PRODUCT_PRICE: 0,
      MONEY_COLLECTION: 0,
      ORDER_SERVICE: 'VHT',
      ORDER_SERVICE_ADD: '',
      SENDER_ADDRESS: senderAddress,
      RECEIVER_ADDRESS: receiverAddress,
      PRODUCT_LENGTH: 0,
      PRODUCT_WIDTH: 0,
      PRODUCT_HEIGHT: 0,
      PRODUCT_TYPE: 'HH',
      NATIONAL_TYPE: 1,
    };

    try {
      const response = await fetch('https://partner.viettelpost.vn/v2/order/getPriceNlp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Token: token,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('ViettelPost HTTP error:', response.statusText);
        return { fee: 30000, error: 'Lỗi kết nối HTTP ViettelPost' };
      }

      const data = await response.json();

      if (data.status === 200 && data.error === false) {
        const fee = data.data?.MONEY_TOTAL || 0;
        return { fee };
      } else {
        console.error('ViettelPost Business error:', data);
        return { fee: 30000, error: data.message };
      }
    } catch (error) {
      console.error('Shipping fee calculation exception:', error);
      return { fee: 30000, error: 'Internal Server Error' };
    }
  }

  async checkProductPurchase(userId: string, productId: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        items: {
          some: {
            productId,
          },
        },
      },
      select: {
        id: true,
        items: {
          where: {
            productId,
          },
          select: {
            size: true,
            color: true,
          },
        },
      },
    });

    return orders.flatMap((order) =>
      order.items.map((item) => ({
        orderId: order.id,
        size: item.size,
        color: item.color,
      })),
    );
  }

  async customerCancelOrder(orderId: string, userId: string, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (order.userId !== userId) {
      throw new BadRequestException('Bạn không có quyền hủy đơn này');
    }

    const cancellableStatuses = ['PENDING', 'CONFIRMED'];
    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException(
        'Chỉ có thể hủy đơn hàng ở trạng thái "Chờ duyệt" hoặc "Đã xác nhận"',
      );
    }

    for (const item of order.items) {
      await this.prisma.product.update({
        where: { id: item.productId },
        data: { stockQuantity: { increment: item.quantity } },
      });
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        customerNote: reason
          ? `${order.customerNote ? order.customerNote + ' | ' : ''}Lý do hủy: ${reason}`
          : order.customerNote,
      },
    });

    return { success: true, order: updated };
  }

  async getQrSummary(code: string) {
    if (!code) {
      throw new BadRequestException('Mã đơn hàng không hợp lệ');
    }

    const cleanCode = code.trim().toUpperCase();

    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { orderCode: cleanCode },
          {
            metadata: {
              path: '$.partner.trackingCode',
              equals: cleanCode,
            },
          },
        ],
      },
      include: {
        items: {
          include: {
            product: {
              select: { name: true, imageUrl: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng với mã này');
    }

    return {
      id: order.id,
      orderCode: order.orderCode,
      totalAmount: order.totalAmount,
      discountAmount: order.discountAmount,
      paymentStatus: order.paymentStatus,
      status: order.status,
      items: order.items.map((item) => ({
        name: item.product?.name || 'Sản phẩm',
        image: item.product?.imageUrl,
        quantity: item.quantity,
      })),
    };
  }

  async trackPublicOrder(code: string, phone: string) {
    if (!code || !phone) {
      throw new BadRequestException('Vui lòng nhập cả mã đơn hàng/mã vận đơn và số điện thoại');
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanPhone = phone.trim();

    const potentialOrders = await this.prisma.order.findMany({
      where: {
        OR: [
          { orderCode: cleanCode },
          {
            metadata: {
              path: '$.partner.trackingCode',
              equals: cleanCode,
            },
          },
        ],
      },
      include: {
        appliedVouchers: {
          select: {
            discountApplied: true,
          },
        },
        items: {
          include: {
            product: {
              select: { name: true, imageUrl: true },
            },
          },
        },
      },
    });

    if (potentialOrders.length === 0) {
      throw new NotFoundException('Không tìm thấy đơn hàng với mã này');
    }

    const matchedOrder = potentialOrders.find((order) => {
      if (order.shippingPhone && order.shippingPhone.includes(cleanPhone)) {
        return true;
      }

      const metadata = order.metadata as any;
      if (
        metadata?.shippingAddress?.phoneNumber &&
        metadata.shippingAddress.phoneNumber.includes(cleanPhone)
      ) {
        return true;
      }

      return false;
    });

    if (!matchedOrder) {
      throw new BadRequestException('Số điện thoại không đúng với đơn hàng này');
    }

    const m = (matchedOrder.metadata as any) || {};
    const voucherDiscountAmount = this.getVoucherDiscountAmount(matchedOrder);

    return {
      id: matchedOrder.id,
      orderCode: matchedOrder.orderCode,
      status: matchedOrder.status,
      createdAt: matchedOrder.createdAt,
      subtotal: matchedOrder.subtotal,
      discountAmount: matchedOrder.discountAmount,
      voucherDiscountAmount,
      shippingFee: this.getDisplayShippingFee(matchedOrder),
      totalAmount: matchedOrder.totalAmount,
      shippingName: matchedOrder.shippingName || m.shippingAddress?.fullName,
      paymentMethod:
        matchedOrder.paymentMethod ||
        (matchedOrder.source === 'PANCAKE' ? 'Thanh toán qua Pancake' : 'Chưa xác định'),
      paymentStatus: matchedOrder.paymentStatus,
      isPancake: matchedOrder.source === 'PANCAKE',
      items: (matchedOrder as any).items.map((item) => ({
        name: item.product?.name || 'Sản phẩm',
        image: item.product?.imageUrl,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        color: item.color,
        isGift: item.isGift,
      })),
      tracking: m.partner
        ? {
            trackingCode: m.partner.trackingCode,
            deliveryName: m.partner.deliveryName,
            deliveryPhone: m.partner.deliveryPhone,
            totalFee: m.partner.totalFee,
            courierUpdates: m.partner.courierUpdates || [],
          }
        : null,
    };
  }

  async hardDelete(id: string, userId: string, role: string, effectiveStoreId?: string | null) {
    if (role !== 'ADMIN' && role !== 'MODERATOR') {
      throw new ForbiddenException('You do not have permission to delete orders');
    }

    await this.findOne(id, userId, role, effectiveStoreId);

    await this.prisma.$transaction(async (tx) => {
      await tx.commissionLedger.deleteMany({ where: { orderId: id } });
      await tx.order.delete({ where: { id } });
    });

    return { success: true, message: 'Đơn hàng đã được xóa vĩnh viễn' };
  }
}
