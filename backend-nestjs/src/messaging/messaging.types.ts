import { MessageChannelCode, Prisma } from '@prisma/client';

export interface MessageRecipientValidationResult {
  isValid: boolean;
  normalizedRecipient?: string;
  errorMessage?: string;
}

export interface MessagingProviderConfigSnapshot {
  id?: string | null;
  providerKey?: string | null;
  settings?: Prisma.JsonValue | null;
  secretSettings?: Prisma.JsonValue | null;
  metadata?: Prisma.JsonValue | null;
}

export interface MessageProviderSendRequest {
  recipient: string;
  content: string;
  idempotencyKey: string;
  providerConfig?: MessagingProviderConfigSnapshot | null;
  metadata?: Prisma.JsonValue | null;
}

export interface MessageProviderSendResult {
  success: boolean;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  rawRequest?: unknown;
  rawResponse?: unknown;
}

export interface MessagingProviderAdapter {
  readonly channelCode: MessageChannelCode;
  validateRecipient(
    recipient: string,
  ): Promise<MessageRecipientValidationResult> | MessageRecipientValidationResult;
  send(request: MessageProviderSendRequest): Promise<MessageProviderSendResult>;
  normalizeResponse(rawResponse: unknown): MessageProviderSendResult;
}

export interface RenderedMessageContent {
  content: string;
  renderedVariables: Record<string, string>;
  unresolvedVariables: string[];
}

export interface QueueMessageInput {
  channelCode: MessageChannelCode;
  recipient: string;
  recipientName?: string;
  audienceId?: string;
  storeId?: string;
  userId?: string;
  orderId?: string;
  campaignId?: string;
  templateId?: string;
  automationRuleId?: string;
  createdById?: string;
  providerConfigId?: string;
  messageContent?: string;
  templateVariables?: Record<string, unknown>;
  metadata?: Prisma.InputJsonValue;
  idempotencyKey?: string;
}

export interface PreviewMessageInput {
  channelCode: MessageChannelCode;
  recipient?: string;
  storeId?: string;
  userId?: string;
  orderId?: string;
  templateId?: string;
  providerConfigId?: string;
  messageContent?: string;
  templateVariables?: Record<string, unknown>;
}

export interface MessageDispatchJobData {
  messageLogId: string;
  idempotencyKey: string;
}
