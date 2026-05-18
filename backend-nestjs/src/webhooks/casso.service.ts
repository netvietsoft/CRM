import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { CommissionsService } from '../commissions/commissions.service';
import { AdminNotificationsService } from '../modules/admin-notifications/admin-notifications.service';
import * as crypto from 'crypto';

interface CassoTransaction {
  id: number;
  reference: string;
  description: string;
  amount: number;
  runningBalance: number;
  transactionDateTime: string;
  accountNumber: string;
  bankName: string;
  bankAbbreviation: string;
  virtualAccountNumber: string;
  virtualAccountName: string;
  counterAccountName: string;
  counterAccountNumber: string;
  counterAccountBankId: string;
  counterAccountBankName: string;
}

export interface CassoWebhookPayload {
  error: number;
  data: CassoTransaction;
}

@Injectable()
export class CassoService {
  private readonly logger = new Logger(CassoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly commissionsService: CommissionsService,
    private readonly adminNotificationsService: AdminNotificationsService,
  ) {}

  verifySignature(signature: string, payload: string, secret: string): boolean {
    try {
      const parts = signature.split(',');
      const timestamp = parts[0]?.split('=')[1];
      const hash = parts[1]?.split('=')[1];

      if (!timestamp || !hash) {
        this.logger.warn('Invalid signature format');
        return false;
      }

      const formats = [
        `${timestamp}.${payload}`,
        payload,
        `${timestamp}${payload}`,
      ];

      for (let i = 0; i < formats.length; i++) {
        const signedPayload = formats[i];
        
        const computedHash = crypto
          .createHmac('sha512', secret)
          .update(signedPayload)
          .digest('hex');

        if (computedHash === hash) {
          return true;
        }
      }

      this.logger.warn('No format matched the signature');
      return false;
    } catch (error) {
      this.logger.error('Error verifying signature:', error);
      return false;
    }
  }

  async processTransaction(transaction: CassoTransaction) {
    const match = transaction.description.match(/ORDER:([A-Z0-9]+)/i);
    if (!match) {
      this.logger.log(`No order reference in transaction ${transaction.reference}`);
      return false;
    }

    const orderCode = match[1];
    
    // Find the order
    const order = await this.prisma.order.findUnique({
      where: { orderCode },
      include: { items: true, user: true }
    });

    if (!order) {
      this.logger.warn(`Order not found for code: ${orderCode}`);
      return false;
    }

    if (order.paymentStatus === 'PAID') {
      this.logger.log(`Order ${orderCode} is already paid.`);
      return true;
    }

    if (this.ordersService.isVietqrExpiryCancellation(order)) {
      this.logger.warn(
        `Late VietQR payment for expired order ${orderCode}. Amount: ${transaction.amount}. Reference: ${transaction.reference}. Order remains CANCELLED.`,
      );
      await this.adminNotificationsService.createNotification({
        type: 'ORDER',
        title: `Thanh toán trễ cho đơn ${orderCode}`,
        message: `Đơn VietQR đã hết hạn và bị huỷ, nhưng Casso ghi nhận giao dịch ${transaction.reference} với số tiền ${transaction.amount}.`,
        link: `/admin/orders/${order.id}`,
        metadata: {
          orderId: order.id,
          orderCode,
          transactionReference: transaction.reference,
          amount: transaction.amount,
          reason: 'VIETQR_LATE_PAYMENT_AFTER_EXPIRY',
        },
      });
      return false;
    }

    // Verify amount (allow 1% tolerance)
    const expectedAmount = Number(order.totalAmount);
    const tolerance = expectedAmount * 0.01;
    if (Math.abs(transaction.amount - expectedAmount) > tolerance) {
      this.logger.warn(`Amount mismatch for order ${orderCode}: expected ${expectedAmount}, got ${transaction.amount}`);
      return false;
    }

    // Update order status
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
          paidAt: new Date(),
        },
      });
      
      // We do not increment user credits, as this is an ecommerce order
      // The commission logic will handle points calculation when the order reaches 'COMPLETED'
    });

    this.logger.log(`Successfully processed VietQR payment for order ${orderCode}`);
    return true;
  }
}
