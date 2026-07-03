import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderSourceDto } from './dto/create-order-source.dto';
import { UpdateOrderSourceDto } from './dto/update-order-source.dto';

@Injectable()
export class OrderSourcesService {
  constructor(private prisma: PrismaService) {}

  // Cache code đã biết để ensureExists không truy DB lặp lại
  private knownCodes = new Set<string>();

  async findAll(activeOnly = false) {
    return this.prisma.orderSource.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.orderSource.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy nguồn đơn');
    return item;
  }

  async create(dto: CreateOrderSourceDto) {
    const code = dto.code.trim().toUpperCase();
    const item = await this.prisma.orderSource.create({
      data: {
        code,
        name: dto.name?.trim() || code,
        type: dto.type || 'manual',
        color: dto.color || null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    this.knownCodes.add(code);
    return item;
  }

  async update(id: string, dto: UpdateOrderSourceDto) {
    await this.findOne(id);
    return this.prisma.orderSource.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.color !== undefined ? { color: dto.color || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.orderSource.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Tự đăng ký 1 code nguồn nếu chưa có (gọi từ chỗ tạo đơn / connector tích hợp).
   * Có cache nên gọi nhiều lần không tốn DB. Không bao giờ throw.
   */
  async ensureExists(code?: string | null, name?: string) {
    if (!code) return;
    const c = code.trim().toUpperCase();
    if (!c || this.knownCodes.has(c)) return;
    try {
      const existing = await this.prisma.orderSource.findUnique({ where: { code: c } });
      if (!existing) {
        await this.prisma.orderSource.create({
          data: { code: c, name: name || c, type: 'integration' },
        });
      }
    } catch {
      // bỏ qua lỗi (vd P2002 do race) — không ảnh hưởng tạo đơn
    } finally {
      this.knownCodes.add(c);
    }
  }
}
