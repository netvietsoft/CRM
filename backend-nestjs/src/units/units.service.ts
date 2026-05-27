import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.unit.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const unit = await this.prisma.unit.findUnique({ where: { id } });
    if (!unit) {
      throw new NotFoundException('Không tìm thấy đơn vị tính');
    }
    return unit;
  }

  async create(dto: CreateUnitDto) {
    const name = dto.name?.trim();
    const code = dto.code?.trim().toUpperCase();

    if (!name || !code) {
      throw new BadRequestException('Tên và mã đơn vị tính là bắt buộc');
    }

    const [existingName, existingCode] = await Promise.all([
      this.prisma.unit.findUnique({ where: { name } }),
      this.prisma.unit.findUnique({ where: { code } }),
    ]);

    if (existingName) {
      throw new BadRequestException('Đơn vị tính đã tồn tại');
    }

    if (existingCode) {
      throw new BadRequestException('Mã đơn vị tính đã tồn tại');
    }

    return this.prisma.unit.create({
      data: {
        name,
        code,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateUnitDto) {
    await this.findOne(id);

    const name = dto.name?.trim();
    const code = dto.code?.trim().toUpperCase();

    if (dto.name !== undefined && name) {
      const existingName = await this.prisma.unit.findUnique({ where: { name } });
      if (existingName && existingName.id !== id) {
        throw new BadRequestException('Đơn vị tính đã tồn tại');
      }
    }

    if (dto.code !== undefined && code) {
      const existingCode = await this.prisma.unit.findUnique({ where: { code } });
      if (existingCode && existingCode.id !== id) {
        throw new BadRequestException('Mã đơn vị tính đã tồn tại');
      }
    }

    return this.prisma.unit.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: name || '' } : {}),
        ...(dto.code !== undefined ? { code: code || '' } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.unit.delete({ where: { id } });
  }
}
