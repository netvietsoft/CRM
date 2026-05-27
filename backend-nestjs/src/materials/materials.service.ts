import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.material.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const material = await this.prisma.material.findUnique({ where: { id } });
    if (!material) {
      throw new NotFoundException('Không tìm thấy chất liệu');
    }
    return material;
  }

  async create(dto: CreateMaterialDto) {
    const name = dto.name?.trim();
    const code = dto.code?.trim() || null;

    if (!name) {
      throw new BadRequestException('Tên chất liệu là bắt buộc');
    }

    const existingName = await this.prisma.material.findUnique({ where: { name } });
    if (existingName) {
      throw new BadRequestException('Chất liệu đã tồn tại');
    }

    if (code) {
      const existingCode = await this.prisma.material.findUnique({ where: { code } });
      if (existingCode) {
        throw new BadRequestException('Mã chất liệu đã tồn tại');
      }
    }

    return this.prisma.material.create({
      data: {
        name,
        code,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateMaterialDto) {
    await this.findOne(id);

    const name = dto.name?.trim();
    const code = dto.code?.trim();

    if (dto.name !== undefined && name) {
      const existingName = await this.prisma.material.findUnique({ where: { name } });
      if (existingName && existingName.id !== id) {
        throw new BadRequestException('Chất liệu đã tồn tại');
      }
    }

    if (dto.code !== undefined && code) {
      const existingCode = await this.prisma.material.findUnique({ where: { code } });
      if (existingCode && existingCode.id !== id) {
        throw new BadRequestException('Mã chất liệu đã tồn tại');
      }
    }

    return this.prisma.material.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: name || '' } : {}),
        ...(dto.code !== undefined ? { code: code || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.material.delete({ where: { id } });
  }
}
