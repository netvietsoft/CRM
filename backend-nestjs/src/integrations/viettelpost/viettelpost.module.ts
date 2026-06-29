import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ViettelpostSyncService } from './viettelpost-sync.service';

@Module({
  imports: [PrismaModule],
  providers: [ViettelpostSyncService],
  exports: [ViettelpostSyncService],
})
export class ViettelpostModule {}
