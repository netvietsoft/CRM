import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductTagDto } from './dto/create-product-tag.dto';
import { UpdateProductTagDto } from './dto/update-product-tag.dto';

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class ProductTagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.productTag.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const tag = await this.prisma.productTag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException('Không tìm thấy tag sản phẩm');
    }
    return tag;
  }

  async create(dto: CreateProductTagDto) {
    const name = dto.name?.trim();
    const slug = slugify(dto.slug?.trim() || name || '');

    if (!name || !slug) {
      throw new BadRequestException('Tên tag sản phẩm là bắt buộc');
    }

    const [existingName, existingSlug] = await Promise.all([
      this.prisma.productTag.findUnique({ where: { name } }),
      this.prisma.productTag.findUnique({ where: { slug } }),
    ]);

    if (existingName) {
      throw new BadRequestException('Tag sản phẩm đã tồn tại');
    }

    if (existingSlug) {
      throw new BadRequestException('Slug tag sản phẩm đã tồn tại');
    }

    return this.prisma.productTag.create({
      data: { name, slug },
    });
  }

  async update(id: string, dto: UpdateProductTagDto) {
    const current = await this.findOne(id);
    const name = dto.name?.trim();
    const slug = dto.slug !== undefined ? slugify(dto.slug.trim()) : undefined;
    const nextName = name ?? current.name;
    const nextSlug = slug ?? (dto.name !== undefined ? slugify(nextName) : current.slug);

    if (dto.name !== undefined) {
      const existingName = await this.prisma.productTag.findUnique({ where: { name: nextName } });
      if (existingName && existingName.id !== id) {
        throw new BadRequestException('Tag sản phẩm đã tồn tại');
      }
    }

    if (dto.slug !== undefined || dto.name !== undefined) {
      const existingSlug = await this.prisma.productTag.findUnique({ where: { slug: nextSlug } });
      if (existingSlug && existingSlug.id !== id) {
        throw new BadRequestException('Slug tag sản phẩm đã tồn tại');
      }
    }

    return this.prisma.productTag.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: nextName } : {}),
        ...(dto.slug !== undefined || dto.name !== undefined ? { slug: nextSlug } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.productTag.delete({ where: { id } });
  }
}
