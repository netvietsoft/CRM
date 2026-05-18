import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';

@Injectable()
export class ZaloTokenService {
  private readonly logger = new Logger(ZaloTokenService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Retrieves the current active access token.
   */
  async getAccessToken(): Promise<string | null> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'ZALO_ACCESS_TOKEN' },
    });

    if (config && config.value) {
      return (config.value as any).token as string;
    }

    return null;
  }

  /**
   * Refreshes the Zalo OA access token using the refresh token stored in DB.
   */
  async refreshToken(): Promise<boolean> {
    this.logger.log('Starting Zalo token refresh process...');

    const appId = process.env.ZALO_APP_ID;
    const secretKey = process.env.ZALO_APP_SECRET;

    if (!appId || !secretKey) {
      this.logger.warn('ZALO_APP_ID or ZALO_APP_SECRET is not configured. Skipping token refresh.');
      return false;
    }

    try {
      const rtConfig = await this.prisma.systemConfig.findUnique({
        where: { key: 'ZALO_REFRESH_TOKEN' },
      });

      if (!rtConfig || !rtConfig.value) {
        this.logger.warn('No ZALO_REFRESH_TOKEN found in SystemConfig. Please authorize manually first.');
        return false;
      }

      const currentRefreshToken = (rtConfig.value as any).token as string;

      const response = await axios.post(
        'https://oauth.zaloapp.com/v4/access_token',
        new URLSearchParams({
          app_id: appId,
          grant_type: 'refresh_token',
          refresh_token: currentRefreshToken,
        }).toString(),
        {
          headers: {
            secret_key: secretKey,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const data = response.data;

      if (data.access_token && data.refresh_token) {
        // Save new access token
        await this.prisma.systemConfig.upsert({
          where: { key: 'ZALO_ACCESS_TOKEN' },
          update: { value: { token: data.access_token, expires_in: data.expires_in } },
          create: { key: 'ZALO_ACCESS_TOKEN', value: { token: data.access_token, expires_in: data.expires_in } },
        });

        // Save new refresh token
        await this.prisma.systemConfig.upsert({
          where: { key: 'ZALO_REFRESH_TOKEN' },
          update: { value: { token: data.refresh_token } },
          create: { key: 'ZALO_REFRESH_TOKEN', value: { token: data.refresh_token } },
        });

        this.logger.log('Successfully refreshed Zalo access token.');
        return true;
      } else {
        this.logger.error(`Failed to refresh token: ${JSON.stringify(data)}`);
        return false;
      }
    } catch (error: any) {
      this.logger.error(`Error refreshing Zalo token: ${error.message}`);
      if (error.response) {
        this.logger.error(`Zalo API Response: ${JSON.stringify(error.response.data)}`);
      }
      return false;
    }
  }

  /**
   * Manually trigger a refresh and return the result.
   */
  async manualRefresh(): Promise<{ success: boolean; message: string }> {
    const success = await this.refreshToken();
    if (success) {
      return { success: true, message: 'Làm mới Zalo Token thành công.' };
    } else {
      return { success: false, message: 'Làm mới thất bại. Vui lòng kiểm tra log hệ thống hoặc thử cập nhật tay.' };
    }
  }

  /**
   * Cron job to refresh token every 20 hours automatically.
   * Access tokens expire in ~24 hours, so 20 hours is safe.
   */
  @Cron('0 */20 * * *')
  async handleTokenRefreshCron() {
    await this.refreshToken();
  }
}
