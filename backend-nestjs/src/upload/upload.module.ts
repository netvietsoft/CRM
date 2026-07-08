import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadController } from './upload.controller';
import { R2Service } from './r2.service';
import { MediaCleanupService } from './media-cleanup.service';

@Module({
  imports: [PrismaModule],
  controllers: [UploadController],
  providers: [R2Service, MediaCleanupService],
  exports: [R2Service, MediaCleanupService],
})
export class UploadModule {}
