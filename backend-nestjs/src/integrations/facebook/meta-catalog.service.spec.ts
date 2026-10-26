import { Test, TestingModule } from '@nestjs/testing';
import { MetaCatalogService } from './meta-catalog.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('MetaCatalogService', () => {
  let service: MetaCatalogService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      fbConnection: {
        findFirst: jest.fn(),
      },
      storeIntegration: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      store: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      product: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetaCatalogService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<MetaCatalogService>(MetaCatalogService);
  });

  it('nên khởi tạo thành công', () => {
    expect(service).toBeDefined();
  });

  describe('getStatus', () => {
    it('trả về thông tin trạng thái catalog và tổng số sản phẩm trong CRM', async () => {
      prisma.store.findFirst.mockResolvedValue({ id: 's1' });
      prisma.product.count.mockResolvedValue(104);
      prisma.storeIntegration.findUnique.mockResolvedValue({
        shopId: 'CATALOG_123',
        isActive: true,
        metadata: {
          catalogId: 'CATALOG_123',
          syncedCount: 104,
          lastSyncedAt: '2026-09-07T10:00:00.000Z',
          status: 'SUCCESS',
        },
      });

      const res = await service.getStatus('s1');
      expect(res.catalogId).toBe('CATALOG_123');
      expect(res.totalCrmProducts).toBe(104);
      expect(res.syncedCount).toBe(104);
      expect(res.status).toBe('SUCCESS');
    });
  });

  describe('saveConfig', () => {
    it('lưu Catalog ID vào StoreIntegration', async () => {
      prisma.store.findFirst.mockResolvedValue({ id: 's1' });
      prisma.storeIntegration.upsert.mockResolvedValue({
        id: 'int-1',
        shopId: 'CATALOG_999',
      });

      const res = await service.saveConfig(null, 'CATALOG_999');
      expect(res.ok).toBe(true);
      expect(res.catalogId).toBe('CATALOG_999');
      expect(prisma.storeIntegration.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { storeId_platform: { storeId: 's1', platform: 'META_CATALOG' } },
        }),
      );
    });

    it('báo lỗi khi Catalog ID rỗng', async () => {
      await expect(service.saveConfig(null, '')).rejects.toThrow('Catalog ID không được để trống');
    });
  });

  describe('syncProducts', () => {
    it('đồng bộ danh sách sản phẩm lên Meta Catalog dạng Batch API', async () => {
      prisma.store.findFirst.mockResolvedValue({ id: 's1' });
      prisma.storeIntegration.findUnique.mockResolvedValue({
        shopId: 'CATALOG_123',
        metadata: { catalogId: 'CATALOG_123' },
      });
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'p1',
          name: 'Váy Linen Be',
          slug: 'vay-linen-be',
          sku: 'VL-001',
          originalPrice: 450000,
          salePrice: 390000,
          stockQuantity: 15,
          imageUrl: 'https://img.com/p1.jpg',
          description: 'Váy linen mát mẻ',
        },
      ]);
      prisma.storeIntegration.upsert.mockResolvedValue({});

      const res = await service.syncProducts('s1', 'CATALOG_123');
      expect(res.ok).toBe(true);
      expect(res.synced).toBe(1);
      expect(res.syncSuccess).toBe(true);
      expect(res.lastResult.sampleProducts[0].retailer_id).toBe('VL-001');
      expect(res.lastResult.sampleProducts[0].title).toBe('Váy Linen Be');
    });

    it('báo lỗi khi chưa cấu hình Catalog ID', async () => {
      prisma.store.findFirst.mockResolvedValue({ id: 's1' });
      prisma.storeIntegration.findUnique.mockResolvedValue(null);

      await expect(service.syncProducts('s1')).rejects.toThrow('Chưa cấu hình Meta Catalog ID');
    });
  });
});
