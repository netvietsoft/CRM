import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus,
  ParseFilePipeBuilder, Post, Query, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { GetEffectiveStoreId } from '../auth/decorators/get-effective-store-id.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from './r2.service';
import { MediaCleanupService } from './media-cleanup.service';

@ApiTags('Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(
    private readonly r2: R2Service,
    private readonly prisma: PrismaService,
    private readonly mediaCleanup: MediaCleanupService,
  ) {}

  // Gỡ file R2 khi user bấm ✕ ảnh vừa upload (chưa lưu vào entity nào) — tránh file mồ côi.
  // An toàn: chỉ xóa khi không còn product/store nào tham chiếu URL; URL ngoài R2 bị bỏ qua.
  @Delete('media')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @ApiOperation({ summary: 'Xóa media trên R2 theo URL (nếu không còn nơi nào dùng)' })
  async deleteMedia(@Query('url') url?: string) {
    if (!url?.trim()) throw new BadRequestException('Thiếu url');
    await this.mediaCleanup.deleteImageIfUnreferenced(url.trim());
    return { success: true };
  }

  // Upload ảnh/tệp/video lên R2 → lưu vào THƯ VIỆN dùng chung (media_assets) → trả URL public.
  @Post('media')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload media lên R2 + lưu thư viện dùng chung' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadMedia(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 25 * 1024 * 1024 })
        .build({ fileIsRequired: true, errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    file: { originalname: string; mimetype: string; buffer: Buffer; size?: number },
    @Body('folder') folder: string | undefined,
    @GetUser('id') userId: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
  ) {
    const f = folder === 'video' || folder === 'file' ? folder : 'images';
    const type = f === 'images' ? 'image' : f;
    const url = await this.r2.upload(file, `ccm/${f}`);
    await this.prisma.mediaAsset.create({
      data: { url, name: file.originalname, type, folder: f, size: file.size ?? file.buffer.length, uploaderId: userId, storeId: effectiveStoreId },
    });
    return { url, name: file.originalname, type };
  }

  // Upload ảnh đánh giá của KHÁCH lên R2 → trả URL public. Cho mọi user đã đăng nhập
  // (không @Roles ⇒ RolesGuard cho qua). KHÔNG lưu thư viện media dùng chung (media_assets).
  @Post('review-image')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload ảnh đánh giá (khách) lên R2' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadReviewImage(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /^image\// })
        .addMaxSizeValidator({ maxSize: 8 * 1024 * 1024 })
        .build({ fileIsRequired: true, errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    file: { originalname: string; mimetype: string; buffer: Buffer; size?: number },
  ) {
    const url = await this.r2.upload(file, 'reviews');
    return { url, name: file.originalname };
  }

  // Danh sách thư viện media dùng chung (lọc theo store hiện hành + loại + tìm tên).
  @Get('media/list')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @ApiOperation({ summary: 'Liệt kê thư viện media dùng chung' })
  async listMedia(
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Query('type') type?: string,
    @Query('q') q?: string,
  ) {
    const where: any = {};
    if (effectiveStoreId) where.storeId = effectiveStoreId;
    if (type && type !== 'all') where.type = type;
    if (q?.trim()) where.name = { contains: q.trim() };
    const assets = await this.prisma.mediaAsset.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 80,
      select: { id: true, url: true, name: true, type: true, createdAt: true },
    });
    return { assets };
  }
}
