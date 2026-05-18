import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { storeId } = body;

    console.log('[API] Starting Pancake product sync via backend...');
    
    // Call backend NestJS API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${backendUrl}/integrations/pancake/sync-products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Backend sync failed');
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: `Đã đồng bộ ${result.synced}/${result.total || result.synced} sản phẩm từ Pancake${result.errors > 0 ? ` (${result.errors} lỗi)` : ''}`,
      synced: result.synced,
      errors: result.errors,
      total: result.total
    });
  } catch (error) {
    console.error('[API] Product sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync products', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
