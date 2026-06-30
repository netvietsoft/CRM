import { createHmac } from 'crypto';
import { verifySignature } from './messenger-signature.util';

describe('verifySignature', () => {
  const secret = 'app-secret';
  const body = Buffer.from('{"object":"page","entry":[]}');

  it('chấp nhận chữ ký sha256 hợp lệ', () => {
    const sig = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
    expect(verifySignature(secret, body, sig)).toBe(true);
  });

  it('từ chối chữ ký sai / thiếu / sai secret', () => {
    const sig = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
    expect(verifySignature(secret, body, 'sha256=deadbeef')).toBe(false);
    expect(verifySignature(secret, body, undefined)).toBe(false);
    expect(verifySignature('', body, sig)).toBe(false);
    expect(verifySignature('other', body, sig)).toBe(false);
  });
});
