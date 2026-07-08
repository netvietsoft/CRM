import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from './r2.service';

/* Dọn file R2 khi ảnh bị THAY hoặc GỠ (chính sách B — xóa tức thì, có kiểm tra tham chiếu).
 * An toàn với thư viện dùng chung: chỉ xóa khi không còn product/store nào khác trỏ tới URL đó.
 * Bỏ qua URL ngoài R2 (uploadthing cũ / URL nhập tay). Best-effort: lỗi xóa R2 KHÔNG ném ra
 * để không làm hỏng luồng lưu/xóa chính. */
@Injectable()
export class MediaCleanupService {
  private readonly logger = new Logger(MediaCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
  ) {}

  // Gọi SAU khi đã commit thay đổi entity (imageUrl/logoUrl mới đã ghi) → đối chiếu URL cũ.
  async deleteImageIfUnreferenced(
    url: string | null | undefined,
    exclude: { productId?: string } = {},
  ): Promise<void> {
    if (!url) return;
    const key = this.r2.keyFromUrl(url);
    if (!key) return; // không phải file R2 của ta → không đụng

    const [productRefs, storeRefs] = await Promise.all([
      this.prisma.product.count({
        where: { imageUrl: url, ...(exclude.productId ? { id: { not: exclude.productId } } : {}) },
      }),
      this.prisma.store.count({ where: { logoUrl: url } }),
    ]);
    if (productRefs > 0 || storeRefs > 0) return; // còn nơi khác dùng → giữ file

    try {
      await this.prisma.mediaAsset.deleteMany({ where: { url } });
      await this.r2.deleteObject(key);
    } catch (e) {
      this.logger.warn(`Xóa media R2 thất bại (${url}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
