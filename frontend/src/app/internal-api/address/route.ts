import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Cache the data in memory after first load
let provincesCache: Record<string, { name: string; name_with_type: string; code: string }> | null = null;
let districtsCache: Record<string, { name: string; name_with_type: string; code: string; parent_code: string }> | null = null;
let wardsCache: Record<string, { name: string; name_with_type: string; code: string; parent_code: string }> | null = null;

function loadProvinces() {
  if (!provincesCache) {
    const filePath = path.join(process.cwd(), 'src/data/tinh_tp.json');
    provincesCache = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return provincesCache!;
}

function loadDistricts() {
  if (!districtsCache) {
    const filePath = path.join(process.cwd(), 'src/data/quan_huyen.json');
    districtsCache = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return districtsCache!;
}

function loadWards() {
  if (!wardsCache) {
    const filePath = path.join(process.cwd(), 'src/data/xa_phuong.json');
    wardsCache = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return wardsCache!;
}

// GET /internal-api/address?type=provinces
// GET /internal-api/address?type=districts&provinceCode=01
// GET /internal-api/address?type=wards&provinceCode=01
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  try {
    if (type === 'provinces') {
      const data = loadProvinces();
      const provinces = Object.values(data)
        .map(p => ({ code: p.code, name: p.name_with_type }))
        .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
      return NextResponse.json(provinces);
    }

    if (type === 'districts') {
      // Return empty because districts were removed July 1, 2025
      return NextResponse.json([]);
    }

    if (type === 'wards') {
      const districtCode = searchParams.get('districtCode');
      const provinceCode = searchParams.get('provinceCode');
      const parentCode = provinceCode || districtCode;

      if (!parentCode) {
        return NextResponse.json({ error: 'provinceCode is required' }, { status: 400 });
      }
      const data = loadWards();
      const wards = Object.values(data)
        .filter(w => w.parent_code === parentCode)
        .map(w => ({ code: w.code, name: w.name_with_type }))
        .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
      return NextResponse.json(wards);
    }

    return NextResponse.json({ error: 'Invalid type. Use: provinces, districts, wards' }, { status: 400 });
  } catch (error) {
    console.error('Address API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
