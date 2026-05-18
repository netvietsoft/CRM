import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { IntegrationsModule } from '../integrations/integrations.module';
import { AdminNotificationsModule } from '../modules/admin-notifications/admin-notifications.module';

@Module({
  imports: [forwardRef(() => IntegrationsModule), AdminNotificationsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
