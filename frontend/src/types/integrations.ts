export interface IntegrationMetadata {
  senderProvince?: string;
  senderWard?: string;
  senderAddress?: string;
  adAccountId?: string; // Meta Ads: act_<id> (để trống = lấy tất cả; nhiều id ngăn cách dấu phẩy)
  businessId?: string; // Meta Ads: Business Manager ID (tự liệt kê mọi ad account)
  [key: string]: string | undefined;
}

export interface Integration {
  id: string;
  platform: string;
  apiKey: string | null;
  apiSecret: string | null;
  shopId: string | null;
  accessToken: string | null;
  isActive: boolean;
  storeId: string;
  metadata?: IntegrationMetadata;
}

export interface IntegrationSyncResponse {
  message?: string;
  synced?: number;
  total?: number;
  totalAmount?: number;
}
