import {
  Controller,
  Post,
  Body,
  UseGuards,
  Headers,
  Logger,
  Query,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { PancakeService } from './pancake.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('Integrations - Pancake')
@Controller('integrations/pancake')
export class PancakeController {
  private readonly logger = new Logger(PancakeController.name);

  constructor(private readonly pancakeService: PancakeService) {}

  @Post('sync-orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync orders from Pancake for a user (Admin only)' })
  async syncOrders(@Body() data: { phone: string; userId: string; storeId?: string }) {
    const totalSpent = await this.pancakeService.syncOrdersForUser(
      data.phone,
      data.userId,
      data.storeId,
    );
    return {
      success: true,
      message: `Synced orders for user ${data.userId}`,
      totalSpent,
    };
  }

  @Post('sync-categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync categories from Pancake (Admin only)' })
  async syncCategories(@Body() data?: { storeId?: string }) {
    const result = await this.pancakeService.syncAllCategories(data?.storeId);
    return {
      success: true,
      message: 'Category sync completed',
      ...result,
    };
  }

  @Post('sync-products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync products from Pancake (Admin only)' })
  async syncProducts(@Body() data?: { storeId?: string }) {
    const result = await this.pancakeService.syncAllProducts(data?.storeId);
    return {
      success: true,
      message: 'Product sync completed',
      ...result,
    };
  }

  @Post('sync-all-orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync all orders from Pancake (Admin only)' })
  async syncAllOrders(
    @Body()
    data?: {
      storeId?: string;
      startDate?: string;
      endDate?: string;
      dates?: string[];
      syncAll?: boolean;
    },
  ) {
    // syncAll (từ 2010 → nay) chạy hàng chục phút — Cloudflare cắt HTTP ~100s → chạy NỀN, kết quả xem log.
    if (data?.syncAll) {
      void this.pancakeService
        .syncAllOrders(data?.storeId, undefined, undefined, undefined, true)
        .then((r) => this.logger.log(`[Pancake] Sync ALL xong: ${JSON.stringify(r)}`))
        .catch((e) => this.logger.error(`[Pancake] Sync ALL lỗi: ${e?.message || e}`));
      return { success: true, started: true, message: 'Đồng bộ TẤT CẢ đang chạy nền — theo dõi số đơn tăng dần trong trang Đơn hàng.' };
    }
    const result = await this.pancakeService.syncAllOrders(
      data?.storeId,
      data?.startDate,
      data?.endDate,
      data?.dates,
      data?.syncAll,
    );
    return {
      success: true,
      message: 'Order sync completed',
      ...result,
    };
  }

  @Post('backfill-order-customers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Backfill Pancake orders without linked customer' })
  async backfillOrderCustomers(@Body() data?: { storeId?: string; limit?: number }) {
    const result = await this.pancakeService.backfillOrderCustomers(data?.storeId, data?.limit);
    return {
      success: true,
      message: 'Pancake order customer backfill completed',
      ...result,
    };
  }

  @Post('webhook')
  @Public()
  @ApiOperation({ summary: 'Webhook endpoint for Pancake order updates' })
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Body() payload: any,
    @Headers('x-pancake-signature') signature: string,
    @Headers('x-pancake-shop-id') shopId: string,
  ) {
    this.logger.log(`📨 Received Pancake webhook: ${JSON.stringify(payload).substring(0, 200)}`);

    const rawBody =
      req?.rawBody || (typeof payload === 'string' ? payload : JSON.stringify(payload || {}));

    // SEC-08: danh tính tenant được suy ra từ secret đã khớp chữ ký, không từ header (client có thể bỏ header).
    const identity = await this.pancakeService.verifyWebhookSignature(rawBody, signature, shopId);
    if (!identity) {
      this.logger.warn(
        `⛔ Unauthorized Pancake webhook signature for shopId: ${shopId || 'unknown'}`,
      );
      throw new ForbiddenException('Invalid webhook signature');
    }

    try {
      const result = await this.pancakeService.handleWebhookEvent(payload, identity);

      return {
        success: true,
        message: 'Webhook processed successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error(`❌ Error processing webhook: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Post('configure-webhook')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Configure webhook on Pancake (Admin only)' })
  async configureWebhook(
    @Body() data: { webhookUrl: string; webhookTypes?: string[]; storeId?: string },
  ) {
    const result = await this.pancakeService.configureWebhook(
      data.webhookUrl,
      data.webhookTypes || ['orders', 'customers'],
      data.storeId,
    );
    return {
      success: true,
      message: 'Webhook configured successfully',
      ...result,
    };
  }

  @Post('webhook-config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current webhook configuration from Pancake (Admin only)' })
  async getWebhookConfig(@Query('storeId') storeId?: string) {
    const config = await this.pancakeService.getWebhookConfig(storeId);
    return {
      success: true,
      data: config,
    };
  }
}
