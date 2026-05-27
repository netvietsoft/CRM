import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateProductTagDto } from './dto/create-product-tag.dto';
import { UpdateProductTagDto } from './dto/update-product-tag.dto';
import { ProductTagsService } from './product-tags.service';

@ApiTags('Product Tags')
@Controller('product-tags')
export class ProductTagsController {
  constructor(private readonly productTagsService: ProductTagsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all product tags' })
  async findAll() {
    return this.productTagsService.findAll();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get product tag by ID' })
  async findOne(@Param('id') id: string) {
    return this.productTagsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product tag' })
  async create(@Body() dto: CreateProductTagDto) {
    return this.productTagsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product tag' })
  async update(@Param('id') id: string, @Body() dto: UpdateProductTagDto) {
    return this.productTagsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a product tag' })
  async remove(@Param('id') id: string) {
    return this.productTagsService.remove(id);
  }
}
