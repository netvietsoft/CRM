import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageChannelCode, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface SmsSendResult {
  success: boolean;
  normalizedPhone: string;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  rawRequest?: unknown;
  rawResponse?: unknown;
}

export interface SmsProviderConfigSnapshot {
  providerKey?: string | null;
  settings?: Prisma.JsonValue | null;
  secretSettings?: Prisma.JsonValue | null;
}

interface ResolvedSmsProviderConfig {
  providerKey: string;
  apiUrl: string;
  user: string;
  pass: string;
  brandName: string;
}

export interface SmsProviderHealthStatus {
  channelCode: MessageChannelCode;
  configured: boolean;
  source: 'DB' | 'ENV' | 'NONE';
  providerKey?: string;
  warnings: string[];
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly defaultApiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.defaultApiUrl =
      this.configService.get<string>('SMS_API_URL') || 'http://125.212.226.79:9020/service/sms_api';
  }

  async sendOtpSms(phone: string, otpCode: string): Promise<boolean> {
    const message = `HTC TB: Ma xac thuc CHY.vn cua ban la ${otpCode}. Tran trong!`;
    const result = await this.sendMessage(phone, message);
    return result.success;
  }

  normalizePhoneNumber(phone: string): string {
    const digitsOnly = phone.replace(/[^\d]/g, '');

    if (!digitsOnly) {
      return '';
    }

    if (digitsOnly.startsWith('0')) {
      return `84${digitsOnly.slice(1)}`;
    }

    if (digitsOnly.startsWith('84')) {
      return digitsOnly;
    }

    return `84${digitsOnly}`;
  }

  async sendMessage(
    phone: string,
    message: string,
    providerConfig?: SmsProviderConfigSnapshot | null,
  ): Promise<SmsSendResult> {
    const normalizedPhone = this.normalizePhoneNumber(phone);

    if (!normalizedPhone) {
      return {
        success: false,
        normalizedPhone,
        errorCode: 'INVALID_PHONE',
        errorMessage: 'So dien thoai khong hop le',
      };
    }

    const resolvedProviderConfig = await this.resolveProviderConfig(providerConfig);

    if (!resolvedProviderConfig) {
      return {
        success: false,
        normalizedPhone,
        errorCode: 'SMS_CONFIG_MISSING',
        errorMessage: 'Thieu cau hinh SMS_API_USER, SMS_API_PASS hoac SMS_API_BRANDNAME',
      };
    }

    if (resolvedProviderConfig.providerKey !== 'NETVIET_SMS_HTTP') {
      return {
        success: false,
        normalizedPhone,
        errorCode: 'SMS_PROVIDER_UNSUPPORTED',
        errorMessage: `Provider ${resolvedProviderConfig.providerKey} chua duoc ho tro`,
      };
    }

    const { apiUrl, user, pass, brandName } = resolvedProviderConfig;
    const providerRequestId = `${brandName}-${normalizedPhone}-${Date.now()}`;
    const payload = {
      phone: normalizedPhone,
      mess: message,
      user,
      pass,
      tranId: providerRequestId,
      brandName,
      dataEncode: 0,
      sendTime: '',
      telcoCode: '',
    };
    const sanitizedRequest = this.sanitizeProviderPayload(payload);

    try {
      this.logger.log(`[SMS] Sending SMS to ${normalizedPhone} with tranId: ${providerRequestId}`);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
        },
        body: JSON.stringify(payload),
      });

      const rawResponse = await this.parseResponse(response);

      if (!response.ok) {
        const errorMessage = `SMS provider HTTP ${response.status}`;
        this.logger.error(`[SMS] ${errorMessage}. Response: ${JSON.stringify(rawResponse)}`);
        return {
          success: false,
          normalizedPhone,
          providerMessageId: this.extractProviderMessageId(rawResponse) || providerRequestId,
          errorCode: String(response.status),
          errorMessage,
          rawRequest: sanitizedRequest,
          rawResponse,
        };
      }

      const success = this.isSuccessResponse(rawResponse);
      const providerMessageId = this.extractProviderMessageId(rawResponse) || providerRequestId;

      if (success) {
        this.logger.log(`[SMS] SMS sent successfully to ${normalizedPhone}`);
        return {
          success: true,
          normalizedPhone,
          providerMessageId,
          rawRequest: sanitizedRequest,
          rawResponse,
        };
      }

      this.logger.error(`[SMS] Provider returned error: ${JSON.stringify(rawResponse)}`);
      return {
        success: false,
        normalizedPhone,
        providerMessageId,
        errorCode: this.extractErrorCode(rawResponse),
        errorMessage: this.extractErrorMessage(rawResponse) || 'SMS provider returned failure',
        rawRequest: sanitizedRequest,
        rawResponse,
      };
    } catch (error: any) {
      this.logger.error(
        `[SMS] Exception when sending SMS to ${normalizedPhone}. Error Name: ${error.name}, Message: ${error.message}, Cause: ${error.cause ? JSON.stringify(error.cause) : 'N/A'}, Code: ${error.code || 'N/A'}`,
      );
      return {
        success: false,
        normalizedPhone,
        errorCode: error.code || error.name || 'SMS_SEND_ERROR',
        errorMessage: error.message || 'SMS send failed',
        rawRequest: sanitizedRequest,
        rawResponse: this.serializeUnknown(error),
      };
    }
  }

  async getProviderHealth(): Promise<SmsProviderHealthStatus> {
    const warnings: string[] = [];
    const defaultProviderConfig = await this.prisma.messageProviderConfig.findFirst({
      where: {
        channel: {
          code: MessageChannelCode.SMS,
        },
        isActive: true,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      select: {
        providerKey: true,
        settings: true,
        secretSettings: true,
      },
    });

    const dbConfig = this.toResolvedProviderConfig(defaultProviderConfig);
    if (dbConfig) {
      if (dbConfig.providerKey !== 'NETVIET_SMS_HTTP') {
        warnings.push(`Provider ${dbConfig.providerKey} chưa được adapter SMS hỗ trợ đầy đủ`);
      }

      return {
        channelCode: MessageChannelCode.SMS,
        configured: true,
        source: 'DB',
        providerKey: dbConfig.providerKey,
        warnings,
      };
    }

    const envConfig = this.toResolvedProviderConfig({
      providerKey: this.configService.get<string>('SMS_PROVIDER_KEY') || 'NETVIET_SMS_HTTP',
      settings: {
        apiUrl: this.configService.get<string>('SMS_API_URL') || this.defaultApiUrl,
        brandName: this.configService.get<string>('SMS_API_BRANDNAME'),
      },
      secretSettings: {
        user: this.configService.get<string>('SMS_API_USER'),
        pass: this.configService.get<string>('SMS_API_PASS'),
      },
    });

    if (envConfig) {
      if (envConfig.providerKey !== 'NETVIET_SMS_HTTP') {
        warnings.push(`Provider ${envConfig.providerKey} chưa được adapter SMS hỗ trợ đầy đủ`);
      }

      return {
        channelCode: MessageChannelCode.SMS,
        configured: true,
        source: 'ENV',
        providerKey: envConfig.providerKey,
        warnings,
      };
    }

    warnings.push('Thiếu cấu hình SMS provider ở DB và env');

    return {
      channelCode: MessageChannelCode.SMS,
      configured: false,
      source: 'NONE',
      warnings,
    };
  }

  private async parseResponse(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return response.json();
    }

    const rawText = await response.text();
    const trimmedText = rawText.trim();

    if (!trimmedText) {
      return rawText;
    }

    try {
      return JSON.parse(trimmedText);
    } catch {
      return rawText;
    }
  }

  private isSuccessResponse(rawResponse: unknown): boolean {
    const response = this.toResponseObject(rawResponse);
    if (!response) {
      return false;
    }

    return (
      response.code === 1 ||
      response.code === '1' ||
      response.code === 0 ||
      response.code === '0' ||
      response.message === 'Success'
    );
  }

  private extractProviderMessageId(rawResponse: unknown): string | undefined {
    const response = this.toResponseObject(rawResponse);
    if (!response) {
      return undefined;
    }

    const value = response.transId ?? response.tranId ?? response.messageId;
    return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
  }

  private extractErrorCode(rawResponse: unknown): string | undefined {
    const response = this.toResponseObject(rawResponse);
    if (!response) {
      return undefined;
    }

    const value = response.code ?? response.errorCode;
    return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
  }

  private extractErrorMessage(rawResponse: unknown): string | undefined {
    const response = this.toResponseObject(rawResponse);
    if (!response) {
      return typeof rawResponse === 'string' ? rawResponse : undefined;
    }

    const value = response.message ?? response.error ?? response.description;
    return typeof value === 'string' ? value : undefined;
  }

  private toResponseObject(rawResponse: unknown): Record<string, unknown> | null {
    if (rawResponse && typeof rawResponse === 'object' && !Array.isArray(rawResponse)) {
      return rawResponse as Record<string, unknown>;
    }

    if (typeof rawResponse !== 'string') {
      return null;
    }

    const trimmedText = rawResponse.trim();
    if (!trimmedText.startsWith('{') || !trimmedText.endsWith('}')) {
      return null;
    }

    try {
      const parsed = JSON.parse(trimmedText);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  private serializeUnknown(value: unknown): unknown {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return String(value);
    }
  }

  private sanitizeProviderPayload(payload: Record<string, unknown>) {
    return {
      ...payload,
      user: this.maskValue(payload.user),
      pass: this.maskValue(payload.pass),
      mess: this.truncateValue(payload.mess, 500),
    };
  }

  private async resolveProviderConfig(providerConfig?: SmsProviderConfigSnapshot | null) {
    const directConfig = this.toResolvedProviderConfig(providerConfig);
    if (directConfig) {
      return directConfig;
    }

    const defaultProviderConfig = await this.prisma.messageProviderConfig.findFirst({
      where: {
        channel: {
          code: MessageChannelCode.SMS,
        },
        isActive: true,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      select: {
        providerKey: true,
        settings: true,
        secretSettings: true,
      },
    });

    const dbConfig = this.toResolvedProviderConfig(defaultProviderConfig);
    if (dbConfig) {
      return dbConfig;
    }

    return this.toResolvedProviderConfig({
      providerKey: this.configService.get<string>('SMS_PROVIDER_KEY') || 'NETVIET_SMS_HTTP',
      settings: {
        apiUrl: this.configService.get<string>('SMS_API_URL') || this.defaultApiUrl,
        brandName: this.configService.get<string>('SMS_API_BRANDNAME'),
      },
      secretSettings: {
        user: this.configService.get<string>('SMS_API_USER'),
        pass: this.configService.get<string>('SMS_API_PASS'),
      },
    });
  }

  private toResolvedProviderConfig(providerConfig?: SmsProviderConfigSnapshot | null) {
    if (!providerConfig) {
      return null;
    }

    const settings = this.toPlainObject(providerConfig.settings);
    const secretSettings = this.toPlainObject(providerConfig.secretSettings);
    const providerKey =
      this.getString(providerConfig.providerKey) ||
      this.getString(settings.providerKey) ||
      this.getString(secretSettings.providerKey) ||
      'NETVIET_SMS_HTTP';
    const apiUrl = this.getString(settings.apiUrl) || this.defaultApiUrl;
    const brandName =
      this.getString(settings.brandName) || this.getString(secretSettings.brandName) || '';
    const user = this.getString(secretSettings.user) || this.getString(settings.user) || '';
    const pass = this.getString(secretSettings.pass) || this.getString(settings.pass) || '';

    if (!apiUrl || !brandName || !user || !pass) {
      return null;
    }

    return {
      providerKey,
      apiUrl,
      brandName,
      user,
      pass,
    } satisfies ResolvedSmsProviderConfig;
  }

  private toPlainObject(value: Prisma.JsonValue | null | undefined) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {} as Record<string, unknown>;
    }

    return value as Record<string, unknown>;
  }

  private getString(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
  }

  private maskValue(value: unknown) {
    const text = this.getString(value);

    if (!text) {
      return '';
    }

    if (text.length <= 4) {
      return '****';
    }

    return `${text.slice(0, 2)}***${text.slice(-2)}`;
  }

  private truncateValue(value: unknown, maxLength: number) {
    const text = this.getString(value);

    if (!text) {
      return '';
    }

    if (text.length <= maxLength) {
      return text;
    }

    return `${text.slice(0, maxLength)}...`;
  }
}
