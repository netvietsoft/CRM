export interface IntegrationMetadata {
  senderProvince?: string;
  senderWard?: string;
  senderAddress?: string;
  adAccountId?: string; // Meta Ads: act_<id>
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
