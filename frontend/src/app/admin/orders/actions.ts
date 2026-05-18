'use server';

import { revalidatePath } from 'next/cache';
import { apiClient } from '@/lib/apiClient';

export async function markOrderAsRead(orderId: string) {
  try {
    await apiClient.patch(`/orders/${orderId}/read`);
    
    // Revalidate the list and the layout (for the sidebar badge)
    revalidatePath('/admin/orders', 'page');
    revalidatePath('/admin', 'layout');
    
    return { success: true };
  } catch (error) {
    console.error('Failed to mark order as read:', error);
    return { success: false };
  }
}
