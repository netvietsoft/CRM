import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { WhatsappService } from './whatsapp.service';

/** Kết nối WhatsApp Business (WABA) — token cần whatsapp_business_management + whatsapp_business_messaging. */
@ApiTags('Integrations/WhatsApp')
@Controller('integrations/whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WhatsappController {
  constructor(private readonly service: WhatsappService) {}

  // Đọc cấu hình đã lưu + gọi Graph xác minh WABA + danh sách số điện thoại (sinh API-usage whatsapp_business_management).
  @Get('status')
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Trạng thái kết nối WABA (xác minh qua Graph)' })
  status() {
    return this.service.status();
  }

  // Gửi tin template hello_world tới 1 số (sinh API-usage whatsapp_business_messaging; dev mode chỉ gửi được số test đã verify).
  @Post('test-message')
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Gửi tin WhatsApp test (template hello_world)' })
  testMessage(@Body() body: { to?: string; phoneNumberId?: string }) {
    if (!body?.to?.trim()) throw new BadRequestException('Thiếu số điện thoại nhận (to)');
    return this.service.sendTestMessage(body.to.trim(), body.phoneNumberId?.trim());
  }
}
