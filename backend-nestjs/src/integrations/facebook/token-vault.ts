import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Két mã hoá token: AES-256-GCM. Key = env TOKEN_ENC_KEY (32 byte, hex 64 ký tự hoặc base64).
 * encryptToken/decryptToken cho FbConnection (3 cột). pack/unpack cho nơi cần lưu 1 chuỗi.
 */
export interface EncToken {
  enc: string; // base64 ciphertext
  iv: string; // base64
  tag: string; // base64
}

function key(): Buffer {
  const raw = process.env.TOKEN_ENC_KEY || '';
  const buf = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new Error('TOKEN_ENC_KEY phải là 32 byte (hex 64 ký tự hoặc base64 44 ký tự).');
  }
  return buf;
}

export function encryptToken(plain: string): EncToken {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return { enc: enc.toString('base64'), iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64') };
}

export function decryptToken(t: EncToken): string {
  const d = createDecipheriv('aes-256-gcm', key(), Buffer.from(t.iv, 'base64'));
  d.setAuthTag(Buffer.from(t.tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(t.enc, 'base64')), d.final()]).toString('utf8');
}

/** Gộp thành 1 chuỗi 'iv:tag:ct' (base64) nếu cần lưu vào 1 cột. */
export const pack = (t: EncToken): string => `${t.iv}:${t.tag}:${t.enc}`;
export const unpack = (s: string): EncToken => {
  const [iv, tag, enc] = s.split(':');
  return { iv, tag, enc };
};
