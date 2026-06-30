import { Body, Controller, ForbiddenException, Get, Headers, Post, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { MessengerService } from './messenger.service';
import { verifySignature } from './messenger-signature.util';

@ApiTags('Messenger')
@Controller('messenger/webhook')
export class MessengerWebhookController {
  constructor(private readonly service: MessengerService) {}

  // Meta gọi để xác minh callback URL (GET hub.challenge).
  @Public()
  @Get()
  @ApiOperation({ summary: 'Meta webhook verify (challenge)' })
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    if (mode === 'subscribe' && token && token === process.env.MESSENGER_VERIFY_TOKEN) return challenge;
    throw new ForbiddenException('Bad verify token');
  }

  // Meta đẩy sự kiện tin nhắn vào đây.
  @Public()
  @Post()
  @ApiExcludeEndpoint()
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') sig: string,
    @Body() body: any,
  ): Promise<string> {
    const raw = req.rawBody ?? Buffer.from(JSON.stringify(body ?? {}));
    if (!verifySignature(process.env.META_APP_SECRET || '', raw, sig)) {
      throw new ForbiddenException('Invalid signature');
    }
    await this.service.ingestEvent(body);
    return 'EVENT_RECEIVED';
  }
}
