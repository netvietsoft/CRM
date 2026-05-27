import { apiClient } from './apiClient';

export interface SessionUser {
  id: string;
  role: string;
  name?: string;
  referralCode?: string | null;
  totalSpent?: number | null;
  commissionBalance?: number | null;
  avatarUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  store?: {
    id: string;
  } | null;
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const user = await apiClient.get<SessionUser>('/users/me');
    return user;
  } catch {
    return null;
  }
}

export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
