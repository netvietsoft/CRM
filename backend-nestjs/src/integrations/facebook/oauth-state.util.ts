import { createHmac, timingSafeEqual } from 'crypto';

/** State ký HMAC cho OAuth (chống CSRF). payload gồm storeId/userId/nonce/ts; TTL 10 phút. */
export interface StatePayload {
  storeId: string | null;
  userId: string;
  nonce: string;
  ts: number;
}

const TTL_MS = 10 * 60 * 1000;
const secret = () => process.env.META_APP_SECRET || process.env.JWT_SECRET || 'dev-secret';

export function signState(p: StatePayload): string {
  const body = Buffer.from(JSON.stringify(p)).toString('base64url');
  const sig = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyState(state?: string): StatePayload | null {
  if (!state || !state.includes('.')) return null;
  const [body, sig] = state.split('.');
  const expected = createHmac('sha256', secret()).update(body).digest('base64url');
  if (sig.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as StatePayload;
    if (!p.ts || Date.now() - p.ts > TTL_MS) return null;
    return p;
  } catch {
    return null;
  }
}
