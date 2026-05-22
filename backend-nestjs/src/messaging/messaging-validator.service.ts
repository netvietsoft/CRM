import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageChannelCode } from '@prisma/client';
import { MessageRecipientValidationResult, RenderedMessageContent } from './messaging.types';

@Injectable()
export class MessagingValidatorService {
  constructor(private readonly configService: ConfigService) {}

  validatePayload(
    channelCode: MessageChannelCode,
    recipientValidation: MessageRecipientValidationResult,
    renderedContent: RenderedMessageContent,
  ) {
    if (!recipientValidation.isValid || !recipientValidation.normalizedRecipient) {
      throw new BadRequestException(recipientValidation.errorMessage || 'Nguoi nhan khong hop le');
    }

    if (!renderedContent.content.trim()) {
      throw new BadRequestException('Noi dung tin nhan khong duoc de trong');
    }

    if (renderedContent.unresolvedVariables.length > 0) {
      throw new BadRequestException(
        `Noi dung tin nhan con thieu bien: ${renderedContent.unresolvedVariables.join(', ')}`,
      );
    }

    if (channelCode === MessageChannelCode.SMS) {
      const maxLength = Number(this.configService.get('SMS_MESSAGE_MAX_LENGTH', 1000));

      if (renderedContent.content.length > maxLength) {
        throw new BadRequestException(`Noi dung SMS vuot qua gioi han ${maxLength} ky tu`);
      }
    }
  }
}
