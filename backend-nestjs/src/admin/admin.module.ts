import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { StaffController } from './staff.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController, StaffController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
