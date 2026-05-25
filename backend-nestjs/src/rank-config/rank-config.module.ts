import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RankConfigController } from './rank-config.controller';
import { RankConfigService } from './rank-config.service';

@Module({
  imports: [PrismaModule],
  controllers: [RankConfigController],
  providers: [RankConfigService],
  exports: [RankConfigService],
})
export class RankConfigModule {}
