import jwt from 'jsonwebtoken';
import { apiClient } from './apiClient';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function verifyToken(token: string): { userId: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
  } catch {
    return null;
  }
}

export async function getSession() {
  try {
    const user = await apiClient.get<any>('/users/me');
    return user;
  } catch (error) {
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
