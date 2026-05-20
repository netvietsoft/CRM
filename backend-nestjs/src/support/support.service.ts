import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AdminNotificationsService } from '../modules/admin-notifications/admin-notifications.service';
import { CreateContactRequestDto } from './dto/create-contact-request.dto';

const SUBJECT_LABELS: Record<string, string> = {
  payment: 'Vấn đề thanh toán',
  voucher: 'Vấn đề voucher',
  login: 'Vấn đề đăng nhập',
  order: 'Vấn đề đơn hàng',
  product: 'Tư vấn sản phẩm',
  warranty: 'Bảo hành & Đổi trả',
  account: 'Vấn đề tài khoản',
  other: 'Vấn đề khác',
};

@Injectable()
export class SupportService {
  constructor(private readonly adminNotificationsService: AdminNotificationsService) {}

  async createContactRequest(dto: CreateContactRequestDto) {
    const subjectLabel = SUBJECT_LABELS[dto.subject] || dto.subject;
    const compactMessage = dto.message.trim().replace(/\s+/g, ' ');
    const preview =
      compactMessage.length > 180 ? `${compactMessage.slice(0, 177)}...` : compactMessage;

    const notification = await this.adminNotificationsService.createNotification({
      type: 'SUPPORT',
      title: `Yêu cầu hỗ trợ mới: ${subjectLabel}`,
      message: `${dto.name} | ${dto.phone} | ${dto.email} | ${preview}`,
      link: '/admin',
      metadata: {
        channel: 'contact-form',
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone.trim(),
        subject: dto.subject,
        subjectLabel,
        message: dto.message.trim(),
      },
    });

    if (!notification) {
      throw new InternalServerErrorException('Không thể gửi yêu cầu hỗ trợ lúc này');
    }

    return {
      success: true,
      message: 'Đã gửi yêu cầu hỗ trợ thành công',
    };
  }
}
