import { createHmac, timingSafeEqual } from 'crypto';

/** Verify X-Hub-Signature-256 của Meta = HMAC-SHA256(app secret, raw body). */
export function verifySignature(appSecret: string, rawBody: Buffer, header?: string): boolean {
  if (!appSecret || !header?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const got = header.slice(7);
  if (got.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
  } catch {
    return false;
  }
}
