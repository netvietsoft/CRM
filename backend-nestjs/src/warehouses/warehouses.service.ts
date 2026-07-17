import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Kho hàng: CRUD kho + bảng sản phẩm trong kho (nhập/tồn/chuyển) + chuyển sản phẩm giữa kho.
 * Mô hình: mỗi sản phẩm thuộc 1 kho (Product.warehouseId); chuyển kho = đổi warehouseId + ghi log
 * WarehouseTransfer (quantity = tồn tại thời điểm chuyển).
 */
@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.warehouse.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    return rows.map((w) => ({
      id: w.id,
      name: w.name,
      address: w.address,
      isActive: w.isActive,
      productCount: w._count.products,
      createdAt: w.createdAt,
    }));
  }

  async create(body: { name?: string; address?: string }) {
    const name = (body.name || '').trim();
    if (!name) throw new BadRequestException('Cần tên kho');
    return this.prisma.warehouse.create({ data: { name, address: body.address?.trim() || null } });
  }

  async update(id: string, body: { name?: string; address?: string; isActive?: boolean }) {
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.address !== undefined) data.address = String(body.address).trim() || null;
    if (body.isActive !== undefined) data.isActive = !!body.isActive;
    const row = await this.prisma.warehouse.update({ where: { id }, data }).catch(() => null);
    if (!row) throw new NotFoundException('Không tìm thấy kho');
    return row;
  }

  async remove(id: string) {
    const count = await this.prisma.product.count({ where: { warehouseId: id } });
    if (count > 0) throw new BadRequestException(`Kho còn ${count} sản phẩm — chuyển hết sản phẩm sang kho khác trước khi xóa.`);
    await this.prisma.warehouse.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Không tìm thấy kho');
    });
    return { ok: true };
  }

  /** Bảng sản phẩm trong kho: STT/tên/nhập/tồn + tổng SL chuyển + lần chuyển đến/đi gần nhất (kèm thời gian). */
  async products(id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) throw new NotFoundException('Không tìm thấy kho');

    const products = await this.prisma.product.findMany({
      where: { warehouseId: id },
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, sku: true, imageUrl: true, stockQuantity: true, isActive: true,
        _count: { select: { orderItems: true } },
      },
    });

    const productIds = products.map((p) => p.id);
    const transfers = productIds.length
      ? await this.prisma.warehouseTransfer.findMany({
          where: { productId: { in: productIds } },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    // Tên kho cho log chuyển (map 1 lần).
    const whIds = new Set<string>();
    for (const t of transfers) {
      if (t.fromWarehouseId) whIds.add(t.fromWarehouseId);
      if (t.toWarehouseId) whIds.add(t.toWarehouseId);
    }
    const whNames = new Map(
      (await this.prisma.warehouse.findMany({ where: { id: { in: [...whIds] } }, select: { id: true, name: true } }))
        .map((w) => [w.id, w.name]),
    );

    const rows = products.map((p) => {
      const mine = transfers.filter((t) => t.productId === p.id);
      const lastIn = mine.find((t) => t.toWarehouseId === id) || null; // chuyển ĐẾN kho này
      const lastOut = mine.find((t) => t.fromWarehouseId === id) || null; // chuyển ĐI khỏi kho này
      const transferredQty = mine.reduce((s, t) => s + (t.quantity || 0), 0);
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        imageUrl: p.imageUrl,
        isActive: p.isActive,
        imported: p.stockQuantity + p._count.orderItems, // nhập kho = tồn + đã bán
        stock: p.stockQuantity, // tồn hiện tại
        transferredQty,
        lastIn: lastIn ? { from: (lastIn.fromWarehouseId && whNames.get(lastIn.fromWarehouseId)) || 'Ngoài kho', quantity: lastIn.quantity, at: lastIn.createdAt } : null,
        lastOut: lastOut ? { to: (lastOut.toWarehouseId && whNames.get(lastOut.toWarehouseId)) || 'Ngoài kho', quantity: lastOut.quantity, at: lastOut.createdAt } : null,
      };
    });

    return { warehouse: { id: warehouse.id, name: warehouse.name, address: warehouse.address }, products: rows };
  }

  /** Chuyển sản phẩm sang kho khác: đổi warehouseId + ghi log (quantity = tồn hiện tại). */
  async transfer(body: { productIds?: string[]; toWarehouseId?: string }) {
    const productIds = Array.isArray(body.productIds) ? body.productIds.filter(Boolean) : [];
    const toWarehouseId = body.toWarehouseId || '';
    if (!productIds.length) throw new BadRequestException('Chưa chọn sản phẩm');
    const target = await this.prisma.warehouse.findUnique({ where: { id: toWarehouseId } });
    if (!target) throw new BadRequestException('Kho đích không tồn tại');

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, warehouseId: true, stockQuantity: true },
    });

    let moved = 0;
    for (const p of products) {
      if (p.warehouseId === toWarehouseId) continue; // đã ở kho đích
      await this.prisma.$transaction([
        this.prisma.product.update({ where: { id: p.id }, data: { warehouseId: toWarehouseId } }),
        this.prisma.warehouseTransfer.create({
          data: { productId: p.id, fromWarehouseId: p.warehouseId, toWarehouseId, quantity: p.stockQuantity },
        }),
      ]);
      moved++;
    }
    return { ok: true, moved, skipped: products.length - moved, toWarehouse: target.name };
  }
}
