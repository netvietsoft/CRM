import { Module, forwardRef } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { PancakeService } from './pancake/pancake.service';
import { PancakeController } from './pancake/pancake.controller';
import { WhatsappService } from './whatsapp/whatsapp.service';
import { WhatsappController } from './whatsapp/whatsapp.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { AdminNotificationsModule } from '../modules/admin-notifications/admin-notifications.module';

@Module({
  imports: [PrismaModule, forwardRef(() => UsersModule), AdminNotificationsModule],
  controllers: [IntegrationsController, PancakeController, WhatsappController],
  providers: [IntegrationsService, PancakeService, WhatsappService],
  exports: [IntegrationsService, PancakeService],
})
export class IntegrationsModule {}
