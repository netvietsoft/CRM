import 'reflect-metadata';
import { PrismaService } from './src/prisma/prisma.service';
import { MetaAdsClient } from './src/integrations/ads/meta/meta-ads.client';
import { MetaAdsConnector } from './src/integrations/ads/meta/meta-ads.connector';
import { AdsSyncService } from './src/integrations/ads/ads-sync.service';

(async () => {
  const days = Number(process.argv[2]) || 30;
  const prisma = new PrismaService();
  await prisma.$connect();
  const connector = new MetaAdsConnector(prisma as any, new MetaAdsClient());
  const sync = new AdsSyncService(prisma as any, connector);
  console.log(`[trigger] Bắt đầu syncAll(${days}) lúc ${new Date().toISOString()}`);
  const r = await sync.syncAll(days);
  console.log('[trigger] KẾT QUẢ:', JSON.stringify(r, null, 2));
  await prisma.$disconnect();
  process.exit(0);
})().catch((e) => {
  console.error('[trigger] ERR', e);
  process.exit(1);
});
