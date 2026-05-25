import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { IntegrationsModule } from '../integrations/integrations.module';
import { AdminNotificationsModule } from '../modules/admin-notifications/admin-notifications.module';
import { RankConfigModule } from '../rank-config/rank-config.module';

@Module({
  imports: [forwardRef(() => IntegrationsModule), AdminNotificationsModule, RankConfigModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
