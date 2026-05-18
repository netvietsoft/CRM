import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AddressService } from './address.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Address')
@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get address data (provinces, districts, wards)' })
  @ApiQuery({ name: 'type', required: true, enum: ['provinces', 'districts', 'wards'] })
  @ApiQuery({ name: 'provinceCode', required: false })
  @ApiQuery({ name: 'districtCode', required: false })
  async getAddress(
    @Query('type') type: string,
    @Query('provinceCode') provinceCode?: string,
    @Query('districtCode') districtCode?: string,
  ) {
    if (type === 'provinces') {
      return this.addressService.getProvinces();
    }

    if (type === 'districts') {
      return this.addressService.getDistricts();
    }

    if (type === 'wards') {
      return this.addressService.getWards(provinceCode, districtCode);
    }

    throw new Error('Invalid type. Use: provinces, districts, wards');
  }
}
