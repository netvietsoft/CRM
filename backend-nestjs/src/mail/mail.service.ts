import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    const isSecure = this.configService.get('SMTP_SECURE') === 'true';
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: parseInt(this.configService.get('SMTP_PORT', '587')),
      secure: isSecure,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  async sendModeratorCredentials(email: string, storeName: string, loginId: string, password: string) {
    this.logger.log(`Attempting to send credentials email to: ${email} (Login ID: ${loginId})`);
    const from = this.configService.get<string>('MAIL_FROM', '"CRM System" <noreply@example.com>');
    
    const mailOptions = {
      from,
      to: email,
      subject: `[${storeName}] Thông tin tài khoản quản trị cửa hàng`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #4f46e5; text-align: center;">Chúc mừng! Cửa hàng của bạn đã được phê duyệt</h2>
          <p>Chào bạn,</p>
          <p>Cửa hàng <strong>${storeName}</strong> của bạn trên hệ thống CRM đã được phê duyệt thành công. Bây giờ bạn có thể đăng nhập vào trang quản trị để bắt đầu kinh doanh.</p>
          
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #374151;"><strong>Thông tin đăng nhập:</strong></p>
            <p style="margin: 10px 0 5px 0;">Tài khoản: <span style="color: #4f46e5; font-weight: bold;">${loginId}</span></p>
            <p style="margin: 0;">Mật khẩu tạm thời: <span style="color: #4f46e5; font-weight: bold;">${password}</span></p>
          </div>
          
          <p style="color: #ef4444; font-size: 14px;"><em>* Lưu ý: Vì lý do bảo mật, vui lòng đổi mật khẩu ngay sau lần đăng nhập đầu tiên.</em></p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${this.configService.get('FRONTEND_URL')}/login" style="background-color: #4f46e5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold;">Đăng nhập ngay</a>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">Đây là email tự động, vui lòng không trả lời email này.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Credentials email sent to ${email} for store ${storeName}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}: ${error.message}`);
      return false;
    }
  }
}
