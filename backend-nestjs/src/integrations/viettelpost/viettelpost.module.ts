import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ViettelpostSyncService } from './viettelpost-sync.service';
import { ViettelCustomerService } from './viettel-customer.service';
import { ViettelpostController } from './viettelpost.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ViettelpostController],
  providers: [ViettelpostSyncService, ViettelCustomerService],
  exports: [ViettelpostSyncService, ViettelCustomerService],
})
export class ViettelpostModule {}
