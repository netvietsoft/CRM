import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateColorDto } from './dto/create-color.dto';

@Injectable()
export class ColorsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all colors
   */
  async findAll() {
    return this.prisma.color.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create a new color
   */
  async create(createColorDto: CreateColorDto) {
    const { name, hexCode } = createColorDto;

    if (!name?.trim()) {
      throw new BadRequestException('Tên màu là bắt buộc');
    }

    // Check if color already exists
    const existingColor = await this.prisma.color.findFirst({
      where: { name: name.trim() },
    });

    if (existingColor) {
      throw new BadRequestException('Màu này đã tồn tại');
    }

    return this.prisma.color.create({
      data: {
        name: name.trim(),
        hexCode: hexCode?.trim() || null,
      },
    });
  }
}
