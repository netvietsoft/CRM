import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCommissionConfigDto } from './dto/update-commission-config.dto';

@Injectable()
export class CommissionConfigService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all active commission configurations
   */
  async findAll() {
    return this.prisma.commissionConfig.findMany({
      where: { isActive: true },
      orderBy: { level: 'asc' },
    });
  }

  /**
   * Upsert commission configuration
   */
  async upsert(updateDto: UpdateCommissionConfigDto) {
    const { level, percentage } = updateDto;

    return this.prisma.commissionConfig.upsert({
      where: { level },
      create: {
        level,
        percentage,
        isActive: true,
      },
      update: {
        percentage,
      },
    });
  }
}
