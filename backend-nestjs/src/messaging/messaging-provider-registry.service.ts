import { Injectable, NotImplementedException } from '@nestjs/common';
import { MessageChannelCode } from '@prisma/client';
import { SmsMessagingProvider } from './providers/sms-messaging.provider';
import { MessagingProviderAdapter } from './messaging.types';

@Injectable()
export class MessagingProviderRegistryService {
  private readonly providers = new Map<MessageChannelCode, MessagingProviderAdapter>();

  constructor(private readonly smsMessagingProvider: SmsMessagingProvider) {
    this.providers.set(MessageChannelCode.SMS, smsMessagingProvider);
  }

  getProvider(channelCode: MessageChannelCode): MessagingProviderAdapter {
    const provider = this.providers.get(channelCode);

    if (!provider) {
      throw new NotImplementedException(`Channel ${channelCode} has no provider adapter yet`);
    }

    return provider;
  }
}
