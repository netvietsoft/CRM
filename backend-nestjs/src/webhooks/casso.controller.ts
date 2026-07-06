import { Controller, Post, Body, Headers, Logger, HttpCode, Req, RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { CassoService, CassoWebhookPayload } from './casso.service';

@Controller('webhooks')
export class CassoController {
  private readonly logger = new Logger(CassoController.name);

  constructor(private readonly cassoService: CassoService) {}

  @Post('casso')
  @Public()
  @HttpCode(200)
  async handleCassoWebhook(
    @Headers('x-casso-signature') cassoSignature: string,
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: CassoWebhookPayload,
  ) {
    this.logger.log(`Received Casso webhook request`);

    const secret = process.env.CASSO_SECURE_TOKEN;
    if (!secret) {
      this.logger.error('CASSO_SECURE_TOKEN not configured');
      return { success: false, error: 'Server configuration error' };
    }

    if (!cassoSignature) {
      this.logger.warn('No signature provided');
      return { success: false, error: 'No signature' };
    }

    // Verify HMAC over the RAW request bytes (what Casso actually signed),
    // not a re-serialized JSON.stringify(payload) which can differ from the wire format.
    const payloadString = req.rawBody?.toString('utf8') ?? JSON.stringify(payload);
    const isValid = this.cassoService.verifySignature(cassoSignature, payloadString, secret);

    if (!isValid) {
      this.logger.warn('Invalid Casso signature');
      return { success: false, error: 'Invalid signature' };
    }

    if (payload.error !== 0 || !payload.data) {
      return { success: true, message: 'No transaction to process' };
    }

    try {
      const result = await this.cassoService.processTransaction(payload.data);
      if (result) {
        return { success: true, message: 'Payment processed successfully' };
      } else {
        return { success: false, error: 'Order not found or amount mismatch' };
      }
    } catch (error) {
      this.logger.error(`Error processing transaction:`, error);
      return { success: false, error: (error as Error).message };
    }
  }
}
