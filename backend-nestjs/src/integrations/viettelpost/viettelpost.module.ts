import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ViettelpostSyncService } from './viettelpost-sync.service';
import { ViettelCustomerService } from './viettel-customer.service';
import { ViettelpostAuthService } from './viettelpost-auth.service';
import { ViettelpostController } from './viettelpost.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ViettelpostController],
  providers: [ViettelpostSyncService, ViettelCustomerService, ViettelpostAuthService],
  exports: [ViettelpostSyncService, ViettelCustomerService, ViettelpostAuthService],
})
export class ViettelpostModule {}
