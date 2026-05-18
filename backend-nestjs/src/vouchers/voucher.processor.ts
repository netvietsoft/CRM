import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

interface ShippingStatus {
  status: 'COMPLETED' | 'RETURNED' | 'CANCELLED' | 'PENDING' | 'SHIPPING';
  orderCode: string;
}

@Processor('voucher-queue')
export class VoucherProcessor extends WorkerHost {
  private readonly logger = new Logger(VoucherProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<any> {
    // Route to appropriate handler based on job name
    switch (job.name) {
      case 'unlock-voucher-task':
        return await this.handleUnlockVoucher(job);
      
      case 'verify-qr-vouchers-job':
        return await this.handleBatchVerification(job);
      
      default:
        this.logger.warn(`⚠️ Unknown job type: ${job.name}`);
        return { success: false, reason: 'Unknown job type' };
    }
  }

  /**
   * Handle delayed unlock voucher task (triggered after 7 days)
   */
  private async handleUnlockVoucher(job: Job): Promise<any> {
    const { userVoucherId, orderCode, voucherCode } = job.data;

    this.logger.log(
      `🔓 Processing unlock voucher task for voucher ${userVoucherId} (Order: ${orderCode})`,
    );

    try {
      // Fetch the voucher from database
      const userVoucher = await this.prisma.userVoucher.findUnique({
        where: { id: userVoucherId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          voucher: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      });

      if (!userVoucher) {
        this.logger.error(`❌ Voucher ${userVoucherId} not found`);
        return { success: false, reason: 'Voucher not found' };
      }

      // Double-check: Verify order status one last time before activating
      const finalCheck = await this.checkShippingStatus(orderCode);

      if (finalCheck.status === 'RETURNED' || finalCheck.status === 'CANCELLED') {
        // Order was returned after delivery - reject voucher
        await this.prisma.userVoucher.update({
          where: { id: userVoucherId },
          data: { status: 'REJECTED' },
        });

        this.logger.warn(
          `⚠️ Voucher ${userVoucherId} rejected - order was returned after delivery`,
        );

        return {
          success: true,
          action: 'rejected',
          reason: 'Order returned after delivery',
        };
      }

      // Activate the voucher
      await this.prisma.userVoucher.update({
        where: { id: userVoucherId },
        data: { status: 'ACTIVE' },
      });

      this.logger.log(
        `✅ Voucher ${userVoucherId} (${voucherCode}) ACTIVATED for user ${userVoucher.user.name}`,
      );

      // TODO: Send notification to user
      // await this.notificationService.sendVoucherActivated(userVoucher.userId, ...);

      return {
        success: true,
        action: 'activated',
        userVoucherId,
        voucherCode,
      };
    } catch (error) {
      this.logger.error(
        `❌ Failed to unlock voucher ${userVoucherId}: ${error.message}`,
        error.stack,
      );
      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Handle batch verification (legacy cronjob fallback)
   */
  private async handleBatchVerification(job: Job): Promise<any> {
    const isManual = job.data.manual || false;
    this.logger.log(
      `🚀 Starting batch voucher verification ${isManual ? '(MANUAL)' : '(SCHEDULED)'}`,
    );

    try {
      // Step 1: Fetch all pending vouchers that need verification
      const now = new Date();
      const pendingVouchers = await this.prisma.userVoucher.findMany({
        where: {
          status: 'PENDING',
          unlockAt: {
            lte: now,
          },
          sourceOrderCode: {
            not: null,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          voucher: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      });

      if (pendingVouchers.length === 0) {
        this.logger.log('✅ No pending vouchers to verify');
        return { processed: 0, activated: 0, rejected: 0 };
      }

      this.logger.log(`📦 Found ${pendingVouchers.length} vouchers to verify`);

      // Step 2: Process in batches to avoid rate limiting
      const BATCH_SIZE = 50;
      let activatedCount = 0;
      let rejectedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < pendingVouchers.length; i += BATCH_SIZE) {
        const batch = pendingVouchers.slice(i, i + BATCH_SIZE);
        this.logger.log(
          `🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(pendingVouchers.length / BATCH_SIZE)}`,
        );

        // Process batch with Promise.allSettled to handle individual failures
        const results = await Promise.allSettled(
          batch.map((userVoucher) =>
            this.verifyAndUpdateVoucher(userVoucher),
          ),
        );

        // Count results
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            if (result.value === 'ACTIVE') {
              activatedCount++;
            } else if (result.value === 'REJECTED') {
              rejectedCount++;
            }
          } else {
            errorCount++;
            this.logger.error(
              `❌ Error processing voucher ${batch[index].id}: ${result.reason}`,
            );
          }
        });

        // Add delay between batches to respect rate limits
        if (i + BATCH_SIZE < pendingVouchers.length) {
          await this.delay(2000); // 2 second delay between batches
        }
      }

      const summary = {
        processed: pendingVouchers.length,
        activated: activatedCount,
        rejected: rejectedCount,
        errors: errorCount,
      };

      this.logger.log(
        `✅ Verification complete: ${activatedCount} activated, ${rejectedCount} rejected, ${errorCount} errors`,
      );

      return summary;
    } catch (error) {
      this.logger.error(`❌ Job failed: ${error.message}`, error.stack);
      throw error; // Re-throw to trigger retry mechanism
    }
  }

  private async verifyAndUpdateVoucher(userVoucher: any): Promise<string> {
    const orderCode = userVoucher.sourceOrderCode;

    try {
      // Check shipping status via ViettelPost API
      const shippingStatus = await this.checkShippingStatus(orderCode);

      let newStatus: string;

      if (shippingStatus.status === 'COMPLETED') {
        // Order delivered successfully - activate voucher
        newStatus = 'ACTIVE';
        await this.prisma.userVoucher.update({
          where: { id: userVoucher.id },
          data: { status: 'ACTIVE' },
        });

        this.logger.log(
          `✅ Voucher ${userVoucher.id} ACTIVATED for user ${userVoucher.user.name} (Order: ${orderCode})`,
        );
      } else if (
        shippingStatus.status === 'RETURNED' ||
        shippingStatus.status === 'CANCELLED'
      ) {
        // Order returned or cancelled - reject voucher
        newStatus = 'REJECTED';
        await this.prisma.userVoucher.update({
          where: { id: userVoucher.id },
          data: { status: 'REJECTED' },
        });

        this.logger.log(
          `❌ Voucher ${userVoucher.id} REJECTED for user ${userVoucher.user.name} (Order: ${orderCode}, Status: ${shippingStatus.status})`,
        );
      } else {
        // Still in transit - keep as PENDING
        newStatus = 'PENDING';
        this.logger.log(
          `⏳ Voucher ${userVoucher.id} still PENDING (Order: ${orderCode}, Status: ${shippingStatus.status})`,
        );
      }

      return newStatus;
    } catch (error) {
      this.logger.error(
        `⚠️ Failed to verify order ${orderCode}: ${error.message}`,
      );
      throw error;
    }
  }

  private async checkShippingStatus(
    orderCode: string,
  ): Promise<ShippingStatus> {
    try {
      const token = process.env.VIETTELPOST_TOKEN;

      if (!token) {
        this.logger.warn('⚠️ VIETTELPOST_TOKEN not configured, using mock data');
        return this.getMockShippingStatus(orderCode);
      }

      // ViettelPost API endpoint for tracking
      const response = await axios.get(
        `https://partner.viettelpost.vn/v2/order/getOrderInfoByCode`,
        {
          params: { ORDER_NUMBER: orderCode },
          headers: {
            Token: token,
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 second timeout
        },
      );

      if (response.data.status === 200 && response.data.data) {
        const orderInfo = response.data.data;
        const status = this.mapViettelPostStatus(orderInfo.ORDER_STATUS);

        return {
          status,
          orderCode,
        };
      }

      // If order not found or error, return PENDING to retry later
      return {
        status: 'PENDING',
        orderCode,
      };
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        this.logger.warn(`⏱️ Timeout checking order ${orderCode}`);
      } else {
        this.logger.error(
          `❌ Error checking shipping status for ${orderCode}: ${error.message}`,
        );
      }

      // Return PENDING on error to retry later
      return {
        status: 'PENDING',
        orderCode,
      };
    }
  }

  private mapViettelPostStatus(
    viettelStatus: number,
  ): ShippingStatus['status'] {
    // ViettelPost status codes mapping
    // Reference: https://viettelpost.vn/thong-tin-don-hang/
    switch (viettelStatus) {
      case 501: // Đã giao hàng
      case 515: // Đã ký nhận
        return 'COMPLETED';

      case 502: // Hoàn trả
      case 503: // Hủy đơn
      case 550: // Không liên hệ được
        return 'RETURNED';

      case 504: // Đã hủy
        return 'CANCELLED';

      default:
        return 'PENDING'; // Still in transit or processing
    }
  }

  private getMockShippingStatus(orderCode: string): ShippingStatus {
    // Mock data for testing when ViettelPost is not configured
    const hash = orderCode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const statuses: ShippingStatus['status'][] = ['COMPLETED', 'PENDING', 'RETURNED'];
    const status = statuses[hash % statuses.length];

    return { status, orderCode };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
