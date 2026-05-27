import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.supplier.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      throw new NotFoundException('Không tìm thấy nhà cung cấp');
    }
    return supplier;
  }

  async create(dto: CreateSupplierDto) {
    const name = dto.name?.trim();
    const code = dto.code?.trim() || null;

    if (!name) {
      throw new BadRequestException('Tên nhà cung cấp là bắt buộc');
    }

    if (code) {
      const existing = await this.prisma.supplier.findUnique({ where: { code } });
      if (existing) {
        throw new BadRequestException('Mã nhà cung cấp đã tồn tại');
      }
    }

    return this.prisma.supplier.create({
      data: {
        name,
        code,
        phone: dto.phone?.trim() || null,
        email: dto.email?.trim() || null,
        address: dto.address?.trim() || null,
        note: dto.note?.trim() || null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id);

    const name = dto.name?.trim();
    const code = dto.code?.trim();

    if (dto.code !== undefined && code) {
      const existing = await this.prisma.supplier.findUnique({ where: { code } });
      if (existing && existing.id !== id) {
        throw new BadRequestException('Mã nhà cung cấp đã tồn tại');
      }
    }

    return this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: name || '' } : {}),
        ...(dto.code !== undefined ? { code: code || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
        ...(dto.email !== undefined ? { email: dto.email?.trim() || null } : {}),
        ...(dto.address !== undefined ? { address: dto.address?.trim() || null } : {}),
        ...(dto.note !== undefined ? { note: dto.note?.trim() || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.supplier.delete({ where: { id } });
  }
}
