import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductTagsController } from './product-tags.controller';
import { ProductTagsService } from './product-tags.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductTagsController],
  providers: [ProductTagsService],
  exports: [ProductTagsService],
})
export class ProductTagsModule {}
