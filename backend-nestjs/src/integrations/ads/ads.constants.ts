/** Hằng số queue đồng bộ Meta Ads (BullMQ). Bỏ trống Redis → fallback chạy inline. */
export const ADS_SYNC_QUEUE = 'ads-sync';
export const ADS_SYNC_JOB = 'ads-sync-job';

export interface AdsSyncJobData {
  days: number;
  /** null = đồng bộ mọi cửa hàng (ADMIN / cron); ngược lại chỉ store này. */
  effectiveStoreId: string | null;
}
