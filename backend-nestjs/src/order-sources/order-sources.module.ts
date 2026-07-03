import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrderSourcesController } from './order-sources.controller';
import { OrderSourcesService } from './order-sources.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrderSourcesController],
  providers: [OrderSourcesService],
  exports: [OrderSourcesService], // để OrdersModule / IntegrationsModule dùng ensureExists
})
export class OrderSourcesModule {}
