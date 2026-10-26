import * as crypto from 'crypto';
import { PancakeService, PancakeWebhookIdentity } from './pancake.service';

const sign = (rawBody: string, secret: string) =>
  crypto.createHmac('sha256', secret).update(Buffer.from(rawBody, 'utf8')).digest('hex');

describe('PancakeService Webhook HMAC Verification', () => {
  let service: PancakeService;
  let prisma: any;

  const mockSecret = 'test-secret-key-12345';
  const mockShopId = 'shop-101';
  const mockStoreId = 'store-1';

  beforeEach(() => {
    prisma = {
      storeIntegration: {
        findMany: jest.fn(),
      },
    };

    service = new PancakeService(prisma, {} as any, {} as any, {} as any);
  });

  it('xác thực thành công chữ ký HMAC-SHA256 hợp lệ → trả về danh tính integration đã khớp', async () => {
    const rawBody = JSON.stringify({ type: 'orders', data: { id: 12345 } });
    const signature = sign(rawBody, mockSecret);

    prisma.storeIntegration.findMany.mockResolvedValue([
      {
        id: 'integration-1',
        storeId: mockStoreId,
        shopId: mockShopId,
        apiKey: 'api-key-1',
        apiSecret: mockSecret,
        metadata: {},
      },
    ]);

    const result = await service.verifyWebhookSignature(rawBody, signature, mockShopId);
    expect(result).toEqual({
      integrationId: 'integration-1',
      storeId: mockStoreId,
      shopId: mockShopId,
    });
    expect(prisma.storeIntegration.findMany).toHaveBeenCalledWith({
      where: { platform: 'PANCAKE', isActive: true, shopId: mockShopId },
      select: expect.objectContaining({ storeId: true }),
    });
  });

  it('từ chối chữ ký giả mạo / không khớp', async () => {
    const rawBody = JSON.stringify({ type: 'orders', data: { id: 12345 } });
    const forgedSignature = sign(rawBody, 'wrong-secret');

    prisma.storeIntegration.findMany.mockResolvedValue([
      {
        id: 'integration-1',
        storeId: mockStoreId,
        shopId: mockShopId,
        apiKey: 'api-key-1',
        apiSecret: mockSecret,
        metadata: {},
      },
    ]);

    const result = await service.verifyWebhookSignature(rawBody, forgedSignature, mockShopId);
    expect(result).toBeNull();
  });

  it('từ chối khi thiếu header signature', async () => {
    const rawBody = JSON.stringify({ type: 'orders', data: { id: 12345 } });
    const result = await service.verifyWebhookSignature(rawBody, undefined, mockShopId);
    expect(result).toBeNull();
    expect(prisma.storeIntegration.findMany).not.toHaveBeenCalled();
  });

  it('từ chối khi không tìm thấy store integration nào active', async () => {
    const rawBody = JSON.stringify({ type: 'orders', data: { id: 12345 } });
    prisma.storeIntegration.findMany.mockResolvedValue([]);

    const result = await service.verifyWebhookSignature(rawBody, 'some-sig', mockShopId);
    expect(result).toBeNull();
  });

  it('hỗ trợ lấy secret từ metadata.webhookSecret hoặc apiKey fallback', async () => {
    const rawBody = 'raw payload test';
    const fallbackSecret = 'webhook-secret-in-meta';
    const signature = sign(rawBody, fallbackSecret);

    prisma.storeIntegration.findMany.mockResolvedValue([
      {
        id: 'integration-2',
        storeId: mockStoreId,
        shopId: mockShopId,
        apiKey: 'api-key',
        apiSecret: null,
        metadata: { webhookSecret: fallbackSecret },
      },
    ]);

    const result = await service.verifyWebhookSignature(rawBody, signature, mockShopId);
    expect(result).toEqual({
      integrationId: 'integration-2',
      storeId: mockStoreId,
      shopId: mockShopId,
    });
  });
});

describe('PancakeService Webhook — ràng buộc tenant theo secret đã xác thực (SEC-08)', () => {
  let service: PancakeService;
  let prisma: any;

  // Hai Store cùng bật Pancake: Y đứng trước trong DB, X là bên thực sự ký webhook.
  const integrationY = {
    id: 'integration-y',
    storeId: 'store-y',
    shopId: 'shop-y',
    apiKey: 'key-y',
    apiSecret: 'secret-y',
    metadata: {},
  };
  const integrationX = {
    id: 'integration-x',
    storeId: 'store-x',
    shopId: 'shop-x',
    apiKey: 'key-x',
    apiSecret: 'secret-x',
    metadata: {},
  };
  const identityX: PancakeWebhookIdentity = {
    integrationId: 'integration-x',
    storeId: 'store-x',
    shopId: 'shop-x',
  };

  beforeEach(() => {
    prisma = {
      storeIntegration: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      order: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    service = new PancakeService(prisma, {} as any, {} as any, {} as any);
  });

  it('không có x-pancake-shop-id: trả về danh tính integration có secret KHỚP, không phải integration đứng đầu', async () => {
    const rawBody = JSON.stringify({ type: 'orders', data: { id: 987654 } });
    prisma.storeIntegration.findMany.mockResolvedValue([integrationY, integrationX]);

    const result = await service.verifyWebhookSignature(
      rawBody,
      sign(rawBody, 'secret-x'),
      undefined,
    );

    expect(result).toEqual(identityX);
    expect(prisma.storeIntegration.findMany).toHaveBeenCalledWith({
      where: { platform: 'PANCAKE', isActive: true },
      select: expect.objectContaining({ storeId: true }),
    });
  });

  it('từ chối (null) khi ≥ 2 integration cùng khớp một chữ ký — không xác định được tenant', async () => {
    const rawBody = 'payload';
    prisma.storeIntegration.findMany.mockResolvedValue([
      { ...integrationY, apiSecret: 'shared-secret' },
      { ...integrationX, apiSecret: 'shared-secret' },
    ]);

    const result = await service.verifyWebhookSignature(
      rawBody,
      sign(rawBody, 'shared-secret'),
      undefined,
    );

    expect(result).toBeNull();
  });

  it('webhook orders: đồng bộ vào đúng storeId đã xác thực, không tra storeIntegration.findFirst', async () => {
    const syncSpy = jest
      .spyOn(service, 'syncSingleOrder')
      .mockResolvedValue({ synced: false, amount: 0 } as any);
    const payload = { type: 'orders', data: { id: 987654, bill_phone_number: '0912345678' } };

    const result = await service.handleWebhookEvent(payload, identityX);

    expect(syncSpy).toHaveBeenCalledWith(payload.data, 'store-x');
    expect(prisma.storeIntegration.findFirst).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: true });
  });

  it('webhook products / inventory: syncAllProducts đúng storeId đã xác thực', async () => {
    const syncAllSpy = jest.spyOn(service, 'syncAllProducts').mockResolvedValue(undefined as any);

    await service.handleWebhookEvent({ type: 'products' }, identityX);
    await service.handleWebhookEvent({ type: 'inventory', data: {} }, identityX);

    expect(syncAllSpy).toHaveBeenCalledTimes(2);
    expect(syncAllSpy).toHaveBeenNthCalledWith(1, 'store-x');
    expect(syncAllSpy).toHaveBeenNthCalledWith(2, 'store-x');
    expect(prisma.storeIntegration.findFirst).not.toHaveBeenCalled();
  });

  it('webhook customers: chỉ gán khách cho đơn PANCAKE thuộc storeId đã xác thực', async () => {
    jest
      .spyOn(service as any, 'resolveCustomerFromPancakeOrder')
      .mockResolvedValue({ id: 'customer-1' });
    jest.spyOn(service as any, 'updateUserRankAndSpent').mockResolvedValue(undefined);

    await service.handleWebhookEvent(
      { type: 'customers', data: { phone_number: '0912345678' } },
      identityX,
    );

    expect(prisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ source: 'PANCAKE', userId: null, storeId: 'store-x' }),
      }),
    );
  });
});
