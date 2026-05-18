import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSizeDto } from './dto/create-size.dto';

@Injectable()
export class SizesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all sizes
   */
  async findAll() {
    return this.prisma.size.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create a new size
   */
  async create(createSizeDto: CreateSizeDto) {
    const { name } = createSizeDto;

    if (!name?.trim()) {
      throw new BadRequestException('Tên size là bắt buộc');
    }

    const normalizedName = name.trim().toUpperCase();

    // Check if size already exists
    const existingSize = await this.prisma.size.findFirst({
      where: { name: normalizedName },
    });

    if (existingSize) {
      throw new BadRequestException('Size này đã tồn tại');
    }

    return this.prisma.size.create({
      data: {
        name: normalizedName,
      },
    });
  }
}
