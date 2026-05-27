import { Module } from '@nestjs/common';
import { SpinService } from './spin.service';
import { SpinController } from './spin.controller';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [MessagingModule],
  controllers: [SpinController],
  providers: [SpinService],
})
export class SpinModule {}
