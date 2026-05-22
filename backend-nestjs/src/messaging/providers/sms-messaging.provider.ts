import { Injectable } from '@nestjs/common';
import { MessageChannelCode } from '@prisma/client';
import { SmsSendResult, SmsService } from '../../integrations/sms/sms.service';
import {
  MessageProviderSendRequest,
  MessageProviderSendResult,
  MessageRecipientValidationResult,
  MessagingProviderAdapter,
} from '../messaging.types';

@Injectable()
export class SmsMessagingProvider implements MessagingProviderAdapter {
  readonly channelCode = MessageChannelCode.SMS;

  constructor(private readonly smsService: SmsService) {}

  validateRecipient(recipient: string): MessageRecipientValidationResult {
    const normalizedRecipient = this.smsService.normalizePhoneNumber(recipient);

    if (!/^84\d{8,11}$/.test(normalizedRecipient)) {
      return {
        isValid: false,
        errorMessage: 'So dien thoai SMS khong hop le',
      };
    }

    return {
      isValid: true,
      normalizedRecipient,
    };
  }

  async send(request: MessageProviderSendRequest): Promise<MessageProviderSendResult> {
    const rawResponse = await this.smsService.sendMessage(
      request.recipient,
      request.content,
      request.providerConfig,
    );
    return this.normalizeResponse(rawResponse);
  }

  normalizeResponse(rawResponse: unknown): MessageProviderSendResult {
    const response = rawResponse as SmsSendResult;

    return {
      success: response.success,
      providerMessageId: response.providerMessageId,
      errorCode: response.errorCode,
      errorMessage: response.errorMessage,
      rawRequest: response.rawRequest,
      rawResponse: response.rawResponse ?? rawResponse,
    };
  }
}
