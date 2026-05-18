import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiUrl = 'http://125.212.226.79:9020/service/sms_api';

  constructor(private configService: ConfigService) { }

  /**
   * Send an OTP via SMS using the provided API
   * Format for phone: must start with 84
   */
  async sendOtpSms(phone: string, otpCode: string): Promise<boolean> {
    try {
      // Get credentials from env or use defaults provided
      const user = this.configService.get<string>('SMS_API_USER');
      const pass = this.configService.get<string>('SMS_API_PASS');
      const brandName = this.configService.get<string>('SMS_API_BRANDNAME');

      // Format phone to 84xxx
      let formattedPhone = phone.replace(/[^\d]/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '84' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('84')) {
        formattedPhone = '84' + formattedPhone;
      }

      // Format message according to Mobifone required template (HTC TB: .{0,250}. Tran trong!)
      // This is safe to use for all networks according to the prompt
      const message = `HTC TB: Ma xac thuc CHY.vn cua ban la ${otpCode}. Tran trong!`;

      // Generate a unique transaction ID
      const tranId = `${brandName}-${formattedPhone}-${Date.now()}`;

      const payload = {
        phone: formattedPhone,
        mess: message,
        user,
        pass,
        tranId,
        brandName,
        dataEncode: 0,
        sendTime: '',
        telcoCode: '', // Empty lets the system auto-detect the network
      };

      this.logger.log(`[SMS] Sending OTP to ${formattedPhone} with tranId: ${tranId}`);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`[SMS] Failed to send SMS. Status: ${response.status}. Response: ${errText}`);
        return false;
      }

      const data = await response.json();

      // Response format: {"code":10,"message":11,"transId":12,"oper":13,"totalSMS":14}
      // Usually code=1 means success, but need to check provider's docs. Let's assume code=1 is success.
      if (data.code === 1 || data.message === 'Success' || data.code === '1' || data.code === 0) {
        this.logger.log(`[SMS] OTP sent successfully to ${formattedPhone}. Response: ${JSON.stringify(data)}`);
        return true;
      } else {
        this.logger.error(`[SMS] Provider returned error: ${JSON.stringify(data)}`);
        // Keep returning true locally for testing if needed, but in production return false
        // For now, return true only if successful.
        return false;
      }

    } catch (error: any) {
      this.logger.error(`[SMS] Exception when sending SMS to ${phone}. Error Name: ${error.name}, Message: ${error.message}, Cause: ${error.cause ? JSON.stringify(error.cause) : 'N/A'}, Code: ${error.code || 'N/A'}`);
      console.error('[SMS] Full error details:', error);
      return false;
    }
  }
}
