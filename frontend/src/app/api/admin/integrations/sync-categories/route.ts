import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { apiClient } from '@/lib/apiClient';

export async function POST() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[API] Starting Pancake category sync via backend...');

    // Call backend NestJS API (apiClient forwards the admin's access token)
    const result = await apiClient.post<{ synced: number; errors: number }>(
      '/integrations/pancake/sync-categories',
    );

    return NextResponse.json({
      success: true,
      message: `Đã đồng bộ ${result.synced} danh mục từ Pancake${result.errors > 0 ? ` (${result.errors} lỗi)` : ''}`,
      synced: result.synced,
      errors: result.errors
    });
  } catch (error) {
    console.error('[API] Category sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync categories', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
