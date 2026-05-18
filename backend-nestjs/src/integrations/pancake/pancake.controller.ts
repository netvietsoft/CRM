import { Controller, Post, Body, UseGuards, Headers, UnauthorizedException, Logger, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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
  async syncAllOrders(@Body() data?: { storeId?: string; startDate?: string; endDate?: string; dates?: string[]; syncAll?: boolean }) {
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

  @Post('webhook')
  @Public()
  @ApiOperation({ summary: 'Webhook endpoint for Pancake order updates' })
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-pancake-signature') signature: string,
    @Headers('x-pancake-shop-id') shopId: string,
  ) {
    this.logger.log(`📨 Received Pancake webhook: ${JSON.stringify(payload).substring(0, 200)}`);

    // Validate webhook (optional - if Pancake provides signature)
    // const isValid = this.pancakeService.validateWebhook(payload, signature, shopId);
    // if (!isValid) {
    //   throw new UnauthorizedException('Invalid webhook signature');
    // }

    try {
      // Process webhook based on event type
      const result = await this.pancakeService.handleWebhookEvent(payload, shopId);
      
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
  async configureWebhook(@Body() data: { webhookUrl: string; webhookTypes?: string[]; storeId?: string }) {
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
