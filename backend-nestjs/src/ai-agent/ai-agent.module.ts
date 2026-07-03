import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { MessengerModule } from '../messenger/messenger.module';
import { AnthropicClient } from './anthropic.client';
import { AiToolsService } from './ai-tools';
import { AiAgentService } from './ai-agent.service';
import { AiAgentController } from './ai-agent.controller';

@Module({
  imports: [PrismaModule, OrdersModule, ProductsModule, MessengerModule],
  controllers: [AiAgentController],
  providers: [AnthropicClient, AiToolsService, AiAgentService],
  exports: [AiAgentService],
})
export class AiAgentModule {}
