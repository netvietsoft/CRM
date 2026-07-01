import { signState, verifyState } from './oauth-state.util';

describe('oauth-state', () => {
  beforeAll(() => { process.env.META_APP_SECRET = 'test-secret'; });

  it('ký rồi verify trả lại payload', () => {
    const p = { storeId: 's1', userId: 'u1', nonce: 'n', ts: Date.now() };
    const got = verifyState(signState(p));
    expect(got).toMatchObject({ storeId: 's1', userId: 'u1' });
  });

  it('giả mạo chữ ký → null', () => {
    const s = signState({ storeId: null, userId: 'u', nonce: 'n', ts: Date.now() });
    const tampered = s.slice(0, -3) + 'xyz';
    expect(verifyState(tampered)).toBeNull();
  });

  it('hết hạn (>10 phút) → null', () => {
    const old = signState({ storeId: null, userId: 'u', nonce: 'n', ts: Date.now() - 11 * 60 * 1000 });
    expect(verifyState(old)).toBeNull();
  });
});
