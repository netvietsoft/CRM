import { encryptToken, decryptToken, pack, unpack } from './token-vault';

describe('token-vault', () => {
  beforeAll(() => { process.env.TOKEN_ENC_KEY = 'a'.repeat(64); }); // 32 byte hex

  it('mã hoá rồi giải mã ra đúng chuỗi', () => {
    const t = encryptToken('secret-long-lived-token');
    expect(t.enc && t.iv && t.tag).toBeTruthy();
    expect(decryptToken(t)).toBe('secret-long-lived-token');
  });

  it('pack/unpack giữ nguyên', () => {
    const t = encryptToken('abc');
    expect(decryptToken(unpack(pack(t)))).toBe('abc');
  });

  it('sai authTag → throw', () => {
    const t = encryptToken('x');
    expect(() => decryptToken({ ...t, tag: Buffer.from('0'.repeat(16)).toString('base64') })).toThrow();
  });
});
