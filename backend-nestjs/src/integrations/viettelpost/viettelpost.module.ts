import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ViettelpostSyncService } from './viettelpost-sync.service';
import { ViettelCustomerService } from './viettel-customer.service';
import { ViettelpostAuthService } from './viettelpost-auth.service';
import { ViettelpostCodService } from './viettelpost-cod.service';
import { VtpAccountsService } from './vtp-accounts.service';
import { ViettelpostController } from './viettelpost.controller';
import { VouchersModule } from '../../vouchers/vouchers.module';

@Module({
  imports: [PrismaModule, VouchersModule],
  controllers: [ViettelpostController],
  providers: [ViettelpostSyncService, ViettelCustomerService, ViettelpostAuthService, ViettelpostCodService, VtpAccountsService],
  exports: [ViettelpostSyncService, ViettelCustomerService, ViettelpostAuthService],
})
export class ViettelpostModule {}
