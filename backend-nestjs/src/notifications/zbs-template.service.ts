import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ZaloTokenService } from './zalo-token.service';
import axios from 'axios';

@Injectable()
export class ZbsTemplateService {
  private readonly logger = new Logger(ZbsTemplateService.name);

  constructor(
    private prisma: PrismaService,
    private zaloTokenService: ZaloTokenService,
  ) {}

  /**
   * Creates a new PROMOTION template via ZBS API.
   * Template content is tailored for sending promotional vouchers.
   */
  async createPromotionTemplate(dto: { name: string; title: string; content: string; buttonName: string; buttonUrl: string }) {
    const accessToken = await this.zaloTokenService.getAccessToken();
    if (!accessToken) {
      throw new HttpException('Zalo Access Token chưa được cấu hình.', HttpStatus.BAD_REQUEST);
    }

    const requestBody = {
      template_name: dto.name,
      template_type: 'PROMOTION',
      template_content: {
        body: {
          components: [
            {
              type: 'TITLE',
              value: dto.title,
            },
            {
              type: 'PARAGRAPH',
              value: dto.content,
            },
            {
              type: 'BUTTON',
              name: dto.buttonName,
              action: 'open_url',
              payload: dto.buttonUrl,
            },
          ],
        },
      },
    };

    try {
      const response = await axios.post(
        'https://business.openapi.zalo.me/template/create',
        requestBody,
        {
          headers: {
            access_token: accessToken,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = response.data;

      // Check for success according to Zalo API docs (error == 0)
      if (data.error === 0 && data.data && data.data.template_id) {
        // Save to database as PENDING_REVIEW
        const template = await this.prisma.notificationTemplate.create({
          data: {
            channel: 'ZALO',
            type: 'PROMOTION_VOUCHER_' + Date.now(), // Generate unique type
            name: dto.name,
            subject: dto.title,
            body: dto.content,
            zaloTemplateId: data.data.template_id.toString(),
            zaloStatus: 'PENDING_REVIEW',
            params: [], // For simple templates without placeholders, or adjust as needed. If template has placeholders, parse them here.
          },
        });

        return template;
      } else {
        this.logger.error(`Failed to create template on Zalo: ${JSON.stringify(data)}`);
        throw new HttpException(`Lỗi từ Zalo: ${data.message}`, HttpStatus.BAD_REQUEST);
      }
    } catch (error: any) {
      this.logger.error(`Error calling ZBS create template API: ${error.message}`);
      if (error.response) {
        this.logger.error(`Zalo API Response: ${JSON.stringify(error.response.data)}`);
        throw new HttpException(`Lỗi từ Zalo: ${error.response.data.message || 'Unknown error'}`, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Lỗi kết nối đến hệ thống Zalo.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Note: The ZBS Template API might not provide an endpoint to list all templates with their statuses directly.
   * If there is an endpoint like GET /template/info, it could be implemented here to sync status.
   * For now, we will assume an endpoint GET https://business.openapi.zalo.me/template/info?template_id=XXX exists
   * based on standard Zalo ZNS patterns.
   */
  async syncTemplateStatus(templateId: string) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template || !template.zaloTemplateId) {
      throw new HttpException('Template không tồn tại hoặc không có Zalo Template ID.', HttpStatus.BAD_REQUEST);
    }

    const accessToken = await this.zaloTokenService.getAccessToken();
    if (!accessToken) {
      throw new HttpException('Zalo Access Token chưa được cấu hình.', HttpStatus.BAD_REQUEST);
    }

    try {
      const response = await axios.get(
        `https://business.openapi.zalo.me/template/info?template_id=${template.zaloTemplateId}`,
        {
          headers: {
            access_token: accessToken,
          },
        },
      );

      const data = response.data;
      if (data.error === 0 && data.data) {
        const newStatus = data.data.status; // ENABLE, PENDING_REVIEW, REJECT
        
        await this.prisma.notificationTemplate.update({
          where: { id: templateId },
          data: { zaloStatus: newStatus },
        });

        return { status: newStatus };
      } else {
        throw new HttpException(`Lỗi từ Zalo: ${data.message}`, HttpStatus.BAD_REQUEST);
      }
    } catch (error: any) {
      this.logger.error(`Error syncing template status: ${error.message}`);
      throw new HttpException('Lỗi khi đồng bộ trạng thái từ Zalo.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
