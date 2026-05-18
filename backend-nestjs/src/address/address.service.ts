import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

// Cache the data in memory after first load
let provincesCache: Record<string, { name: string; name_with_type: string; code: string }> | null = null;
let districtsCache: Record<string, { name: string; name_with_type: string; code: string; parent_code: string }> | null = null;
let wardsCache: Record<string, { name: string; name_with_type: string; code: string; parent_code: string }> | null = null;

@Injectable()
export class AddressService {
  private loadProvinces() {
    if (!provincesCache) {
      const filePath = path.join(process.cwd(), 'src/address/data/tinh_tp.json');
      provincesCache = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    return provincesCache!;
  }

  private loadDistricts() {
    if (!districtsCache) {
      const filePath = path.join(process.cwd(), 'src/address/data/quan_huyen.json');
      districtsCache = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    return districtsCache!;
  }

  private loadWards() {
    if (!wardsCache) {
      const filePath = path.join(process.cwd(), 'src/address/data/xa_phuong.json');
      wardsCache = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    return wardsCache!;
  }

  /**
   * Get all provinces
   */
  getProvinces() {
    const data = this.loadProvinces();
    const provinces = Object.values(data)
      .map(p => ({ code: p.code, name: p.name_with_type }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    return provinces;
  }

  /**
   * Get districts (deprecated - returns empty array)
   */
  getDistricts() {
    // Return empty because districts were removed July 1, 2025
    return [];
  }

  /**
   * Get wards by province code
   */
  getWards(provinceCode?: string, districtCode?: string) {
    const parentCode = provinceCode || districtCode;

    if (!parentCode) {
      throw new BadRequestException('provinceCode is required');
    }

    const data = this.loadWards();
    const wards = Object.values(data)
      .filter(w => w.parent_code === parentCode)
      .map(w => ({ code: w.code, name: w.name_with_type }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    return wards;
  }
}
