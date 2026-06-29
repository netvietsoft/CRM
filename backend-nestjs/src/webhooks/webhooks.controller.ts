import { Controller, Post, Body, Headers, Logger, HttpCode } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { WebhooksService } from './webhooks.service';

@Controller('viettelpost')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  // ViettelPost đẩy hành trình đơn về đây (1 URL duy nhất theo tài liệu partner2).
  // URL đăng ký bên VTP: https://<domain>/api/viettelpost/webhook
  @Post('webhook')
  @Public()
  @HttpCode(200)
  async handleViettelWebhook(
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log(
      `📨 [VTP] webhook ${payload?.DATA?.ORDER_NUMBER} status ${payload?.DATA?.ORDER_STATUS}`,
    );
    return this.webhooksService.handleViettelWebhook(payload, headers);
  }
}
