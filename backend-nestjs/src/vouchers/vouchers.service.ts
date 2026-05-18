import { Injectable, Logger, OnModuleInit, BadRequestException, NotFoundException, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SmsService } from '../integrations/sms/sms.service';

@Injectable()
export class VouchersService implements OnModuleInit {
  private readonly logger = new Logger(VouchersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
    @Optional() @InjectQueue('voucher-queue') private voucherQueue?: Queue,
  ) {}

  async onModuleInit() {
    // Only register cron job if queue is available
    if (this.voucherQueue) {
      await this.registerCronJob();
      this.logger.log('✅ Voucher verification cron job registered successfully (fallback mode)');
    } else {
      this.logger.warn('⚠️  Voucher queue not available - background verification disabled');
    }
  }

  private async registerCronJob() {
    if (!this.voucherQueue) return;

    // Remove any existing repeatable jobs with the same name
    const repeatableJobs = await this.voucherQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === 'verify-qr-vouchers-job') {
        await this.voucherQueue.removeRepeatableByKey(job.key);
      }
    }

    // Add new repeatable job - runs at 00:00 every day (fallback for missed webhooks)
    await this.voucherQueue.add(
      'verify-qr-vouchers-job',
      {},
      {
        repeat: {
          pattern: '0 0 * * *', // Cron pattern: 00:00 daily
        },
        jobId: 'verify-qr-vouchers-job',
      },
    );

    this.logger.log('📅 Fallback cron job scheduled: verify-qr-vouchers-job at 00:00 daily');
  }

  async findAll(storeId?: string) {
    const now = new Date();
    const vouchers = await this.prisma.voucher.findMany({
      where: {
        isActive: true,
        campaignCategory: { notIn: ['GAMIFICATION', 'REFERRAL'] },
        AND: [
          ...(storeId ? [{ OR: [{ storeId }, { storeId: null }] }] : []),
          { OR: [{ validTo: null }, { validTo: { gt: now } }] },
        ],
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            userVouchers: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Filter out vouchers that have reached their total usage limit
    return vouchers.filter(v => {
      if (v.totalUsageLimit !== null && v._count.userVouchers >= v.totalUsageLimit) {
        return false;
      }
      return true;
    }).map(v => {
      const { _count, ...rest } = v;
      return rest;
    });
  }

  async findOne(id: string) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    return voucher;
  }

  async sendOtp(phone: string, orderCode: string) {
    // Normalize phone
    const normalizedPhone = phone.replace(/[\s\-]/g, '');
    if (!normalizedPhone || normalizedPhone.length < 9) {
      throw new BadRequestException('Số điện thoại không hợp lệ');
    }

    if (!orderCode) {
      throw new BadRequestException('Mã đơn hàng không hợp lệ');
    }

    // --- VERIFY ORDER EXISTS AND PHONE MATCHES ---
    // Try to find order by orderCode (internal CRM orders)
    let order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { orderCode: orderCode },
          { metadata: { path: '$.trackingNumber', equals: orderCode } },
        ],
      },
      select: {
        shippingPhone: true,
        user: { select: { phone: true } },
      },
    });

    if (!order) {
      order = await this.prisma.order.findFirst({
        where: { metadata: { string_contains: orderCode } },
        select: {
          shippingPhone: true,
          user: { select: { phone: true } },
        },
      });
    }

    if (!order) {
      throw new BadRequestException('Không tìm thấy đơn hàng với mã này. Vui lòng kiểm tra lại.');
    }

    // Verify phone number matches
    const orderPhone = (order.shippingPhone || order.user?.phone || '').replace(/[\s\-]/g, '');
    if (!orderPhone || !normalizedPhone.endsWith(orderPhone.slice(-9)) && !orderPhone.endsWith(normalizedPhone.slice(-9))) {
      throw new BadRequestException('Số điện thoại không khớp với đơn hàng. Vui lòng nhập đúng SĐT đặt hàng để lấy mã.');
    }

    // Check if there's an existing unexpired OTP to prevent spam
    const existingOtp = await this.prisma.otpRecord.findFirst({
      where: {
        phone: normalizedPhone,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingOtp) {
      // Check if it was created less than 60 seconds ago
      const now = new Date();
      const diffSecs = (now.getTime() - existingOtp.createdAt.getTime()) / 1000;
      if (diffSecs < 60) {
        throw new BadRequestException('Vui lòng đợi 60 giây trước khi yêu cầu mã mới.');
      }
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Expire in 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Save to DB
    await this.prisma.otpRecord.create({
      data: {
        phone: normalizedPhone,
        otpCode,
        expiresAt,
      },
    });

    // Send SMS
    const isSent = await this.smsService.sendOtpSms(normalizedPhone, otpCode);
    if (!isSent) {
      throw new BadRequestException('Không thể gửi tin nhắn SMS lúc này. Vui lòng thử lại sau.');
    }

    return {
      success: true,
      message: 'Mã OTP đã được gửi đến số điện thoại của bạn.',
    };
  }

  async claimQRVoucher(userId: string, orderCode: string, phone: string, voucherId?: string, otp?: string) {
    const MAX_QR_CLAIMS = 5;
    
    // Get lock duration from system config, fallback to 7 days
    const sysConfig = await this.prisma.systemConfig.findUnique({
      where: { key: 'qr_voucher_default' },
    });
    const sysConfigData = sysConfig?.value as any;
    const LOCK_DURATION_DAYS = sysConfigData?.lockDurationDays || 7;

    // Normalize phone: remove spaces, dashes
    const normalizedPhone = phone.replace(/[\s\-]/g, '');

    // Check if order code already used
    const existingClaim = await this.prisma.userVoucher.findUnique({
      where: { sourceOrderCode: orderCode },
    });

    if (existingClaim) {
      throw new BadRequestException('Mã đơn hàng này đã được sử dụng để nhận quà');
    }

    if (!otp) {
      throw new BadRequestException('Vui lòng nhập mã OTP');
    }

    // Verify OTP
    const otpRecord = await this.prisma.otpRecord.findFirst({
      where: {
        phone: normalizedPhone,
        otpCode: otp,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otpRecord) {
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
    }

    // Mark OTP as used
    await this.prisma.otpRecord.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });

    // --- VERIFY ORDER EXISTS AND STATUS ---
    // Try to find order by orderCode (internal CRM orders)
    let order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { orderCode: orderCode },
          // Also check in metadata for external tracking codes (ViettelPost, Pancake)
          { metadata: { path: '$.trackingNumber', equals: orderCode } },
        ],
      },
      select: {
        id: true,
        status: true,
        shippingPhone: true,
        userId: true,
        updatedAt: true,
        user: {
          select: { phone: true },
        },
      },
    });

    // If no order found by orderCode, try searching in metadata as string contains
    if (!order) {
      order = await this.prisma.order.findFirst({
        where: {
          metadata: { string_contains: orderCode },
        },
        select: {
          id: true,
          status: true,
          shippingPhone: true,
          userId: true,
          updatedAt: true,
          user: {
            select: { phone: true },
          },
        },
      });
    }

    if (!order) {
      throw new BadRequestException('Không tìm thấy đơn hàng với mã này. Vui lòng kiểm tra lại.');
    }

    // Verify phone number matches
    const orderPhone = (order.shippingPhone || order.user?.phone || '').replace(/[\s\-]/g, '');
    if (!orderPhone || !normalizedPhone.endsWith(orderPhone.slice(-9)) && !orderPhone.endsWith(normalizedPhone.slice(-9))) {
      throw new BadRequestException('Số điện thoại không khớp với đơn hàng. Vui lòng nhập đúng SĐT đặt hàng.');
    }

    // Check order status - only allow for delivered/completed orders
    const ALLOWED_STATUSES = ['DELIVERED', 'PAYMENT_COLLECTED', 'COMPLETED'];
    if (!ALLOWED_STATUSES.includes(order.status)) {
      const statusMessages: Record<string, string> = {
        PENDING: 'Đơn hàng đang chờ xử lý',
        CONFIRMED: 'Đơn hàng đã xác nhận nhưng chưa giao',
        PACKAGING: 'Đơn hàng đang đóng gói',
        WAITING_FOR_SHIPPING: 'Đơn hàng đang chờ vận chuyển',
        SHIPPED: 'Đơn hàng đang được giao, vui lòng chờ nhận hàng',
        CANCELLED: 'Đơn hàng đã bị hủy',
        REFUNDED: 'Đơn hàng đã hoàn trả',
      };
      const msg = statusMessages[order.status] || `Trạng thái đơn hàng: ${order.status}`;
      throw new BadRequestException(`Chưa thể nhận voucher. ${msg}. Bạn cần nhận hàng thành công trước khi nhận quà.`);
    }

    // Check user claim count for gamification
    const userClaimCount = await this.prisma.userVoucher.count({
      where: {
        userId,
        sourceOrderCode: { not: null },
      },
    });

    if (userClaimCount >= MAX_QR_CLAIMS) {
      throw new BadRequestException(`Bạn đã hết lượt nhận quà (tối đa ${MAX_QR_CLAIMS} lần)`);
    }

    let finalVoucherId = voucherId;

    // If no voucherId provided, determine which voucher to use
    if (!finalVoucherId) {
      // Priority 1: Check for order-specific voucher created by admin
      const orderVoucher = await this.prisma.voucher.findUnique({
        where: { code: `QR-ORDER-${orderCode}` },
      });

      if (orderVoucher && orderVoucher.isActive) {
        finalVoucherId = orderVoucher.id;
      } else {
        // Priority 2 & 3: Use system config values array for gamification tiers
        const config = await this.prisma.systemConfig.findUnique({
          where: { key: 'qr_voucher_default' },
        });
        const configData = config?.value as any;

        // Ensure we have an array of values (support both new 'values' array and old 'value' fallback)
        let configValues = [50000, 40000, 30000, 20000, 10000]; // Absolute fallback
        if (configData?.values && Array.isArray(configData.values) && configData.values.length > 0) {
          configValues = configData.values;
        } else if (configData?.value) {
          configValues = [configData.value];
        }

        // Get min order values array
        let configMinOrderValues = configValues.map(() => configData?.minOrderValue || 0);
        if (configData?.minOrderValues && Array.isArray(configData.minOrderValues)) {
          configMinOrderValues = configData.minOrderValues;
        }
        
        // Determine amount and min order based on claim count (if count exceeds array, use the last value)
        const voucherAmount = configValues[userClaimCount] || configValues[configValues.length - 1];
        const voucherMinOrder = configMinOrderValues[userClaimCount] ?? configMinOrderValues[configMinOrderValues.length - 1] ?? 0;
        
        // Include minOrderValue in the code to allow different constraints for the same amount
        const voucherCode = `QR-DEFAULT-${voucherAmount}-${voucherMinOrder}`;

        let defaultVoucher = await this.prisma.voucher.findUnique({
          where: { code: voucherCode },
        });

        if (!defaultVoucher) {
          defaultVoucher = await this.prisma.voucher.create({
            data: {
              code: voucherCode,
              name: `Voucher QR ${voucherAmount.toLocaleString('vi-VN')}đ`,
              description: `Giảm ${voucherAmount.toLocaleString('vi-VN')}đ cho đơn hàng từ ${voucherMinOrder.toLocaleString('vi-VN')}đ`,
              campaignCategory: 'GAMIFICATION',
              type: 'FIXED_AMOUNT',
              value: voucherAmount,
              minOrderValue: voucherMinOrder,
              perCustomerLimit: 1,
              isActive: true,
            },
          });
        }
        finalVoucherId = defaultVoucher.id;


      }
    }

    // Check if voucher exists and is active
    const voucher = await this.prisma.voucher.findUnique({
      where: { id: finalVoucherId },
      include: {
        _count: {
          select: { userVouchers: true },
        },
      },
    });

    if (!voucher || !voucher.isActive) {
      throw new NotFoundException('Voucher không tồn tại hoặc đã hết hạn');
    }

    let isImmediatelyActive = false;

    if (voucher.code.startsWith('QR-ORDER-')) {
      let resolvedStatus = voucher.status || 'AUTO';
      if (resolvedStatus === 'AUTO') {
        const isDelivered = order.status === 'DELIVERED' || order.status === 'PAYMENT_COLLECTED' || order.status === 'COMPLETED';
        if (isDelivered && order.updatedAt) {
          const deliveredDate = new Date(order.updatedAt);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - deliveredDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays >= 7) {
            resolvedStatus = 'ACTIVE';
          } else {
            resolvedStatus = 'PENDING';
          }
        } else if (order.status === 'CANCELLED' || order.status === 'REFUNDED' || order.status === 'RETURNING') {
          resolvedStatus = 'LOCKED';
        } else {
          resolvedStatus = 'PENDING';
        }
      }

      if (resolvedStatus === 'LOCKED') {
        throw new BadRequestException('Voucher của đơn hàng này đã bị tạm khoá.');
      } else if (resolvedStatus === 'ACTIVE') {
        isImmediatelyActive = true;
      }
    }

    if (voucher.totalUsageLimit !== null && voucher._count.userVouchers >= voucher.totalUsageLimit) {
      throw new BadRequestException('Voucher này đã hết số lượng phát hành');
    }

    // Create user voucher with PENDING status
    const unlockAt = new Date();
    unlockAt.setDate(unlockAt.getDate() + LOCK_DURATION_DAYS);

    const expiresAt = voucher.durationDays
      ? new Date(Date.now() + voucher.durationDays * 24 * 60 * 60 * 1000)
      : voucher.validTo || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    const userVoucher = await this.prisma.userVoucher.create({
      data: {
        userId,
        voucherId: finalVoucherId,
        sourceOrderCode: orderCode,
        unlockAt: isImmediatelyActive ? new Date() : unlockAt,
        expiresAt,
        status: isImmediatelyActive ? 'ACTIVE' : 'PENDING',
        isUsed: false,
      },
      include: {
        voucher: true,
      },
    });

    this.logger.log(
      `🎫 User ${userId} claimed voucher ${finalVoucherId} with order ${orderCode}. Status: ${isImmediatelyActive ? 'ACTIVE' : 'PENDING'}, unlock at: ${isImmediatelyActive ? new Date() : unlockAt}`,
    );

    return {
      success: true,
      message: isImmediatelyActive 
        ? `Chúc mừng! Bạn đã nhận được voucher ${voucher.value.toLocaleString('vi-VN')}đ. Voucher đã có thể sử dụng ngay.`
        : `Chúc mừng! Bạn đã nhận được voucher ${voucher.value.toLocaleString('vi-VN')}đ. Voucher sẽ khả dụng sau ${LOCK_DURATION_DAYS} ngày.`,
      userVoucher,
    };
  }

  /**
   * Create a dedicated voucher for a specific order (Admin only)
   */
  async createOrderVoucher(
    data: {
      orderId: string; 
      name?: string;
      type?: 'FIXED_AMOUNT' | 'PERCENT' | 'FREESHIP' | 'STACK';
      value?: number; 
      maxDiscount?: number;
      minOrderValue?: number;
      durationDays?: number;
      perCustomerLimit?: number;
      stackTiers?: any;
    },
    user?: any,
    effectiveStoreId?: string | null,
  ) {
    const { orderId, name, type, value, maxDiscount, minOrderValue, durationDays, perCustomerLimit, stackTiers } = data;

    // Find the order
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderCode: true, totalAmount: true, storeId: true },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (user && user.role !== 'ADMIN' && effectiveStoreId && order.storeId !== effectiveStoreId) {
      throw new BadRequestException('Bạn chỉ có thể tạo voucher cho đơn hàng thuộc cửa hàng của mình');
    }

    // Check if this order already has a dedicated voucher
    const existingVoucher = await this.prisma.voucher.findUnique({
      where: { code: `QR-ORDER-${order.orderCode}` },
    });

    if (existingVoucher) {
      throw new BadRequestException('Đơn hàng này đã có voucher riêng rồi');
    }

    // Get default config if value not provided
    let voucherValue = value;
    let voucherMinOrder = minOrderValue;

    if (voucherValue === undefined) {
      const config = await this.prisma.systemConfig.findUnique({
        where: { key: 'qr_voucher_default' },
      });
      const configData = config?.value as any;
      
      // Fallback to first mốc if array exists, otherwise old single value
      voucherValue = configData?.values?.[0] ?? configData?.value ?? 50000;
      voucherMinOrder = voucherMinOrder ?? configData?.minOrderValues?.[0] ?? configData?.minOrderValue ?? 0;
    }

    const voucherType = type || 'FIXED_AMOUNT';
    const voucherName = name || `Voucher QR đơn #${order.orderCode}`;

    // Create the voucher (GAMIFICATION category so it won't show in user-facing lists)
    const voucher = await this.prisma.voucher.create({
      data: {
        code: `QR-ORDER-${order.orderCode}`,
        name: voucherName,
        description: `Voucher riêng dành cho đơn hàng #${order.orderCode}`,
        campaignCategory: 'GAMIFICATION',
        type: voucherType,
        value: voucherValue,
        maxDiscount: maxDiscount || null,
        minOrderValue: voucherMinOrder || 0,
        durationDays: durationDays || null,
        stackTiers: stackTiers || null,
        perCustomerLimit: perCustomerLimit ?? 1,
        totalUsageLimit: perCustomerLimit ?? 1,
        isActive: true,
        storeId: order.storeId || null,
      },
    });

    this.logger.log(
      `🎟️ Created order-specific voucher ${voucher.code} (${voucherValue}) for order #${order.orderCode}`,
    );

    return {
      success: true,
      message: `Đã tạo voucher ${voucherValue.toLocaleString('vi-VN')}${voucherType === 'PERCENT' ? '%' : 'đ'} cho đơn hàng #${order.orderCode}`,
      voucher,
    };
  }

  /**
   * Get voucher info for a specific order
   */
  async getOrderVoucher(orderCode: string, user?: any, effectiveStoreId?: string | null) {
    const voucher = await this.prisma.voucher.findFirst({
      where: { 
        code: `QR-ORDER-${orderCode}`,
        ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
      },
    });

    return { exists: !!voucher, voucher: voucher || null };
  }

  /**
   * Get all order-specific vouchers for admin management
   */
  async getOrderVouchersList(user?: any, effectiveStoreId?: string | null) {
    let storeFilter: any = {};
    if (effectiveStoreId) {
      storeFilter = { storeId: effectiveStoreId };
    }

    const vouchers = await this.prisma.voucher.findMany({
      where: {
        ...storeFilter,
        code: { startsWith: 'QR-ORDER-' },
      },
      include: {
        userVouchers: {
          select: {
            id: true,
            isUsed: true,
            userId: true,
            expiresAt: true,
            status: true,
            appliedOrders: {
              select: { discountApplied: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (vouchers.length === 0) return [];

    const orderCodes = vouchers.map(v => v.code.replace('QR-ORDER-', ''));
    
    const orders = await this.prisma.order.findMany({
      where: { orderCode: { in: orderCodes } },
      select: {
        id: true,
        orderCode: true,
        totalAmount: true,
        shippingPhone: true,
        status: true,
        updatedAt: true,
        user: { select: { phone: true } },
      },
    });

    const orderMap = new Map(orders.map(o => [o.orderCode, o]));

    return vouchers.map(v => {
      const orderCode = v.code.replace('QR-ORDER-', '');
      const order = orderMap.get(orderCode);
      const usedCount = v.userVouchers.filter(uv => uv.isUsed).length;
      const claimedCount = v.userVouchers.length;
      const totalDiscountUsed = v.userVouchers.reduce((sum, uv) => {
        return sum + uv.appliedOrders.reduce((s, ao) => s + (ao.discountApplied || 0), 0);
      }, 0);
      // Compute voucher monetary value
      const voucherMonetaryValue = v.type === 'PERCENT'
        ? (order ? order.totalAmount * (v.value / 100) : 0)
        : v.value;
      const remainingValue = Math.max(0, voucherMonetaryValue - totalDiscountUsed);

      const { userVouchers, ...voucherData } = v;

      let resolvedStatus = voucherData.status || 'AUTO';
      if (resolvedStatus === 'AUTO') {
        if (!order) {
          resolvedStatus = 'PENDING';
        } else {
          const isDelivered = order.status === 'DELIVERED' || order.status === 'PAYMENT_COLLECTED' || order.status === 'COMPLETED';
          if (isDelivered) {
            if (order.updatedAt) {
              const deliveredDate = new Date(order.updatedAt);
              const now = new Date();
              const diffTime = Math.abs(now.getTime() - deliveredDate.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays >= 7) {
                resolvedStatus = 'ACTIVE';
              } else {
                resolvedStatus = 'PENDING';
              }
            } else {
              resolvedStatus = 'PENDING';
            }
          } else if (order.status === 'CANCELLED' || order.status === 'REFUNDED' || order.status === 'RETURNING') {
            resolvedStatus = 'LOCKED';
          } else {
            resolvedStatus = 'PENDING';
          }
        }
      }

      return {
        ...voucherData,
        resolvedStatus,
        orderId: order?.id || null,
        orderCode,
        phone: order?.shippingPhone || order?.user?.phone || 'N/A',
        orderTotalAmount: order?.totalAmount || 0,
        usedCount,
        claimedCount,
        totalDiscountUsed,
        voucherMonetaryValue,
        remainingValue,
      };
    });
  }

  async getUserVouchers(userId: string) {
    const now = new Date();
    const vouchers = await this.prisma.userVoucher.findMany({
      where: { userId },
      include: {
        voucher: {
          include: {
            store: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Mark PENDING vouchers that have passed their unlock date as ACTIVE
    for (const uv of vouchers) {
      if (uv.status === 'PENDING' && uv.unlockAt && new Date(uv.unlockAt) <= now) {
        await this.prisma.userVoucher.update({
          where: { id: uv.id },
          data: { status: 'ACTIVE' },
        });
        uv.status = 'ACTIVE';
      }
    }

    return vouchers;
  }

  async manualTriggerVerification() {
    if (!this.voucherQueue) {
      this.logger.warn('⚠️  Queue not available - cannot trigger manual verification');
      throw new BadRequestException('Queue service not available. Redis is required for background jobs.');
    }

    // Add a one-time job to the queue
    const job = await this.voucherQueue.add('verify-qr-vouchers-job', {
      manual: true,
    });

    this.logger.log(`🔧 Manual verification triggered. Job ID: ${job.id}`);

    return {
      success: true,
      message: 'Verification job has been queued',
      jobId: job.id,
    };
  }

  /**
   * Helper: get storeId for a MODERATOR user
   */
  private async getStoreIdForUser(user: any): Promise<string | null> {
    if (!user || user.role !== 'MODERATOR') return null;
    const store = await this.prisma.store.findUnique({
      where: { ownerId: user.id },
      select: { id: true },
    });
    return store?.id || null;
  }

  async findAllAdmin(excludeGamification: boolean = false, user?: any, effectiveStoreId?: string | null) {
    let storeFilter: any = {};

    if (effectiveStoreId) {
      storeFilter = { storeId: effectiveStoreId };
    }

    return this.prisma.voucher.findMany({
      where: {
        ...storeFilter,
        ...(excludeGamification && { campaignCategory: { not: 'GAMIFICATION' } }),
      },
      include: {
        _count: {
          select: {
            userVouchers: true,
          },
        },
        store: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(data: any, user?: any, effectiveStoreId?: string | null) {
    const formattedData = { ...data };
    
    if (formattedData.validFrom === '') formattedData.validFrom = null;
    if (formattedData.validTo === '') formattedData.validTo = null;
    
    if (formattedData.validFrom) formattedData.validFrom = new Date(formattedData.validFrom);
    if (formattedData.validTo) formattedData.validTo = new Date(formattedData.validTo);

    // Mutation Anti-Spoofing: If not admin, force storeId
    if (user && user.role !== 'ADMIN') {
      if (!effectiveStoreId) {
        throw new BadRequestException('User has no assigned store');
      }
      formattedData.storeId = effectiveStoreId;
    }

    return this.prisma.voucher.create({
      data: {
        ...formattedData,
        isActive: formattedData.isActive !== undefined ? formattedData.isActive : true,
      },
    });
  }

  async update(id: string, data: any, user?: any, effectiveStoreId?: string | null) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id },
    });

    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    if (user && user.role !== 'ADMIN' && effectiveStoreId && voucher.storeId !== effectiveStoreId) {
      throw new NotFoundException('Voucher not found or access denied');
    }

    const formattedData = { ...data };
    
    if (formattedData.validFrom === '') formattedData.validFrom = null;
    if (formattedData.validTo === '') formattedData.validTo = null;
    
    if (formattedData.validFrom) formattedData.validFrom = new Date(formattedData.validFrom);
    if (formattedData.validTo) formattedData.validTo = new Date(formattedData.validTo);

    return this.prisma.voucher.update({
      where: { id },
      data: formattedData,
    });
  }

  async remove(id: string, user?: any, effectiveStoreId?: string | null) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id },
    });

    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    if (user && user.role !== 'ADMIN' && effectiveStoreId && voucher.storeId !== effectiveStoreId) {
      throw new NotFoundException('Voucher not found or access denied');
    }

    // Hard delete if it is already inactive
    if (!voucher.isActive) {
      await this.prisma.userVoucher.deleteMany({
        where: { voucherId: id },
      });
      return this.prisma.voucher.delete({
        where: { id },
      });
    }

    // Instead of deleting, we might want to just deactivate if it has user claims
    const claimsCount = await this.prisma.userVoucher.count({
      where: { voucherId: id },
    });

    if (claimsCount > 0) {
      return this.prisma.voucher.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.voucher.delete({
      where: { id },
    });
  }

  async grantWelcomeVouchers(userId: string) {
    // Find all active welcome vouchers
    const welcomeVouchers = await this.prisma.voucher.findMany({
      where: {
        campaignCategory: 'WELCOME',
        isActive: true,
      },
      include: {
        _count: {
          select: { userVouchers: true },
        },
      },
    });

    if (welcomeVouchers.length === 0) {
      this.logger.log(`No welcome vouchers available for user ${userId}`);
      return;
    }

    let grantedCount = 0;
    // Grant each welcome voucher to the user
    for (const voucher of welcomeVouchers) {
      if (voucher.totalUsageLimit !== null && voucher._count.userVouchers >= voucher.totalUsageLimit) {
        continue; // Skip if limit reached
      }

      const expiresAt = voucher.durationDays
        ? new Date(Date.now() + voucher.durationDays * 24 * 60 * 60 * 1000)
        : voucher.validTo || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

      await this.prisma.userVoucher.create({
        data: {
          userId,
          voucherId: voucher.id,
          expiresAt,
          status: 'ACTIVE',
          isUsed: false,
        },
      });
      grantedCount++;
    }

    if (grantedCount > 0) {
      this.logger.log(`✅ Granted ${grantedCount} welcome vouchers to user ${userId}`);
    }
  }

  /**
   * Get all referral vouchers for admin management
   */
  async getReferralVouchersList(user?: any, effectiveStoreId?: string | null) {
    let storeFilter: any = {};
    if (effectiveStoreId) {
      storeFilter = { storeId: effectiveStoreId };
    }

    return this.prisma.voucher.findMany({
      where: {
        ...storeFilter,
        campaignCategory: 'REFERRAL',
      },
      include: {
        _count: {
          select: { userVouchers: true },
        },
        store: {
          select: { name: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a referral voucher (force campaignCategory = REFERRAL)
   */
  async createReferralVoucher(data: any, user?: any, effectiveStoreId?: string | null) {
    return this.create({ ...data, campaignCategory: 'REFERRAL' }, user, effectiveStoreId);
  }

  /**
   * Get referral reward config from SystemConfig
   */
  async getReferralRewardConfig() {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'referral_rewards' },
    });
    if (!config) {
      return { tiers: [] };
    }
    return config.value as any;
  }

  /**
   * Save referral reward config to SystemConfig
   */
  async saveReferralRewardConfig(data: { tiers: any[] }) {
    return this.prisma.systemConfig.upsert({
      where: { key: 'referral_rewards' },
      create: {
        key: 'referral_rewards',
        value: data as any,
      },
      update: {
        value: data as any,
      },
    });
  }

  /**
   * Grant referral reward to referrer when a new user signs up.
   * Checks the current number of referees and applies the matching reward tier.
   */
  async grantReferralReward(referrerId: string) {
    try {
      // Count how many direct referees this referrer has (depth=1 in closure)
      const refereeCount = await this.prisma.user.count({
        where: { referrerId },
      });

      // Get reward config
      const config = await this.getReferralRewardConfig();
      const tiers = config?.tiers || [];

      if (tiers.length === 0) {
        this.logger.log(`No referral reward config found. Skipping reward for referrer ${referrerId}`);
        return;
      }

      // Find the tier matching this referral count (1-indexed)
      const tier = tiers.find((t: any) => t.milestone === refereeCount);
      if (!tier) {
        this.logger.log(`No reward tier for milestone ${refereeCount}. Referrer: ${referrerId}`);
        return;
      }

      if (tier.rewardType === 'SPIN') {
        // Grant spin turns
        const spins = tier.spinTurns || 1;
        await this.prisma.user.update({
          where: { id: referrerId },
          data: { spinTurns: { increment: spins } },
        });
        this.logger.log(`🎰 Granted ${spins} spin turn(s) to referrer ${referrerId} for milestone ${refereeCount}`);
      } else if (tier.rewardType === 'VOUCHER' && tier.voucherId) {
        // Grant voucher
        const voucher = await this.prisma.voucher.findUnique({
          where: { id: tier.voucherId },
        });

        if (voucher) {
          const expiresAt = voucher.durationDays
            ? new Date(Date.now() + voucher.durationDays * 24 * 60 * 60 * 1000)
            : voucher.validTo || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

          await this.prisma.userVoucher.create({
            data: {
              userId: referrerId,
              voucherId: voucher.id,
              expiresAt,
              status: 'ACTIVE',
              isUsed: false,
            },
          });
          this.logger.log(`🎫 Granted voucher "${voucher.code}" to referrer ${referrerId} for milestone ${refereeCount}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error granting referral reward to ${referrerId}:`, error);
    }
  }
}
