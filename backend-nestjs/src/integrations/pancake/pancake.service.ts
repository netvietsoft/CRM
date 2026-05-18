import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../../users/users.service';
import { AdminNotificationsService } from '../../modules/admin-notifications/admin-notifications.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class PancakeService {
  private readonly logger = new Logger(PancakeService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private usersService: UsersService,
    private adminNotificationsService: AdminNotificationsService,
  ) {}

  private normalizePhone(phone: string) {
    return phone.replace(/\D/g, '');
  }

  private buildPhoneSearchTerms(phone: string) {
    const rawPhone = phone.trim();
    const normalizedPhone = this.normalizePhone(rawPhone);
    const searchTerms = new Set<string>();

    if (rawPhone) searchTerms.add(rawPhone);
    if (normalizedPhone) searchTerms.add(normalizedPhone);

    if (normalizedPhone.length === 9) {
      searchTerms.add(`0${normalizedPhone}`);
    }

    if (normalizedPhone.startsWith('84') && normalizedPhone.length >= 11) {
      searchTerms.add(`0${normalizedPhone.slice(2)}`);
    }

    if (normalizedPhone.startsWith('0') && normalizedPhone.length >= 10) {
      searchTerms.add(`84${normalizedPhone.slice(1)}`);
    }

    return Array.from(searchTerms).filter(term => term.length >= 9);
  }

  private async getActivePancakeIntegrations(storeId?: string) {
    const integrations = await this.prisma.storeIntegration.findMany({
      where: {
        platform: 'PANCAKE',
        isActive: true,
        ...(storeId ? { storeId } : {}),
      },
      select: {
        storeId: true,
        shopId: true,
        apiKey: true,
      },
    });

    return integrations.filter((integration) => {
      if (!integration.storeId || !integration.shopId || !integration.apiKey) {
        this.logger.warn('[Pancake] Ignoring active integration missing storeId, shopId or apiKey');
        return false;
      }
      return true;
    });
  }

  private async getPancakeConfig(storeId?: string, shopId?: string) {
    const whereClause: any = { platform: 'PANCAKE', isActive: true };
    if (storeId) whereClause.storeId = storeId;
    if (shopId) whereClause.shopId = shopId;

    const pConfig = await this.prisma.storeIntegration.findFirst({
      where: whereClause
    });
    
    if (!pConfig) {
      this.logger.error(`[Pancake] No active Pancake integration found in database (storeId: ${storeId}, shopId: ${shopId})`);
      return null;
    }

    const configShopId = pConfig.shopId;
    const apiKey = pConfig.apiKey;

    if (!configShopId || !apiKey) {
      this.logger.error('[Pancake] Pancake integration found but missing Shop ID or API Key');
      return null;
    }

    this.logger.log(`[Pancake] Using config from database - Shop ID: ${configShopId.substring(0, 8)}...`);
    return { shopId: configShopId, apiKey };
  }

  async fetchOrdersByPhone(phone: string, storeId?: string) {
    const config = await this.getPancakeConfig(storeId);
    if (!config) return [];

    try {
      const url = `https://pos.pages.fm/api/v1/shops/${config.shopId}/orders?api_key=${config.apiKey}&search=${encodeURIComponent(phone)}&page_size=100`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        this.logger.error('[Pancake] Failed to fetch orders');
        return [];
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        return data.data;
      }
      
      return [];
    } catch (error) {
      this.logger.error('[Pancake] Error fetching orders:', error);
      return [];
    }
  }

  private buildDateRange(date: string) {
    const match = /^\d{4}-\d{2}-\d{2}$/.test(date);
    if (!match) {
      throw new Error(`Invalid date format: ${date}`);
    }

    const start = new Date(`${date}T00:00:00+07:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return { start, end };
  }

  private getPancakeOrderCreatedAt(order: any) {
    const rawDate = order?.inserted_at || order?.created_at || order?.updated_at || null;
    if (!rawDate) return null;
    const parsed = new Date(rawDate);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private isOrderInDateRange(order: any, start: Date, end: Date) {
    const createdAt = this.getPancakeOrderCreatedAt(order);
    if (!createdAt) return true;
    return createdAt >= start && createdAt < end;
  }

  private async fetchOrdersByDateRangeForIntegration(
    integration: { storeId: string; shopId: string | null; apiKey: string | null },
    start: Date,
    end: Date,
  ) {
    if (!integration.shopId || !integration.apiKey) return [];

    const orders = new Map<string, any>();
    const pageSize = 100;
    let page = 1;
    let shouldContinue = true;

    while (shouldContinue && page <= 100) {
      const query = new URLSearchParams({
        api_key: integration.apiKey,
        page: String(page),
        page_size: String(pageSize),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        inserted_at_min: start.toISOString(),
        inserted_at_max: end.toISOString(),
      });

      const url = `https://pos.pages.fm/api/v1/shops/${integration.shopId}/orders?${query.toString()}`;

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) break;

        const data = await response.json();
        const pageOrders = Array.isArray(data.data) ? data.data : [];
        if (pageOrders.length === 0) break;

        let pageHadInRangeOrder = false;
        let pageHadOlderOrder = false;

        for (const order of pageOrders) {
          const createdAt = this.getPancakeOrderCreatedAt(order);
          if (createdAt && createdAt < start) {
            pageHadOlderOrder = true;
            continue;
          }

          if (this.isOrderInDateRange(order, start, end)) {
            pageHadInRangeOrder = true;
            orders.set(String(order.id), order);
          }
        }

        const totalPages = data.total_pages || data.totalPages || 0;
        const hasMoreByPagination = totalPages ? page < totalPages : pageOrders.length >= pageSize;
        shouldContinue = hasMoreByPagination && (!pageHadOlderOrder || pageHadInRangeOrder);
        page++;
      } catch (error) {
        break;
      }
    }

    return Array.from(orders.values());
  }

  async fetchOrderDetail(orderId: number, storeId?: string) {
    const config = await this.getPancakeConfig(storeId);
    if (!config) return null;

    try {
      const url = `https://pos.pages.fm/api/v1/shops/${config.shopId}/orders/${orderId}?api_key=${config.apiKey}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      return null;
    }
  }

  private extractItemsMetadata(items: any[]) {
    if (!items || items.length === 0) return [];
    return items.map(item => ({
      name: item.variation_info?.name || 'Sản phẩm không rõ',
      price: item.variation_info?.retail_price || 0,
      quantity: item.quantity || 1,
      image: item.variation_info?.images?.[0] || null,
      images: item.variation_info?.images || [],
      productId: item.product_id || null,
      variationId: item.variation_id || null,
      displayId: item.variation_info?.display_id || null,
      productDisplayId: item.variation_info?.product_display_id || null,
      barcode: item.variation_info?.barcode || null,
      weight: item.variation_info?.weight || 0,
      fields: item.variation_info?.fields || [],
      detail: item.variation_info?.detail || null,
      discountEachProduct: item.discount_each_product || 0,
      isDiscountPercent: item.is_discount_percent || false,
      isBonusProduct: item.is_bonus_product || false,
      isWholesale: item.is_wholesale || false,
      isComposite: item.is_composite || false,
      note: item.note || item.note_product || null,
      returnedCount: item.returned_count || 0,
      categoryIds: item.variation_info?.category_ids || [],
    }));
  }

  private extractCustomerInfo(orderDetail: any) {
    const customer = orderDetail?.customer;
    const shippingAddr = orderDetail?.shipping_address;
    const addresses = customer?.shop_customer_addresses || [];
    const primaryAddr = addresses[0];

    let province = null;
    let ward = null;

    if (primaryAddr?.full_address) {
      const parts = primaryAddr.full_address.split(',').map((s: string) => s.trim());
      if (parts.length >= 2) {
        province = parts[parts.length - 1];
        ward = parts[parts.length - 2];
      }
    }

    const rawGender = customer?.gender;
    let parsedGender = null;
    const genderStr = String(rawGender).toLowerCase().trim();
    if (rawGender === 1 || genderStr === '1' || genderStr === 'male' || genderStr === 'nam') parsedGender = 'MALE';
    else if (rawGender === 2 || genderStr === '2' || genderStr === 'female' || genderStr === 'nữ' || genderStr === 'nu') parsedGender = 'FEMALE';
    else if (genderStr === 'other' || genderStr === 'khác' || genderStr === 'khac') parsedGender = 'OTHER';

    return {
      name: customer?.name || shippingAddr?.full_name || null,
      gender: parsedGender,
      email: customer?.email || customer?.email_address || shippingAddr?.email || null,
      dob: customer?.date_of_birth || customer?.birthday || null,
      fullAddress: shippingAddr?.full_address || primaryAddr?.full_address || null,
      street: shippingAddr?.address || primaryAddr?.address || null,
      province,
      ward,
    };
  }

  private parseDate(value?: string | null): string | null {
    if (!value) return null;

    const normalized = value.trim();
    let toParse = normalized;
    
    // Handle ISO-like strings (e.g., 2026-05-07T04:38:46.664424 or 2026-05-07T04:38:46Z)
    if (/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/.test(normalized)) {
      // Normalize to ISO format with T separator
      toParse = normalized.replace(' ', 'T');
      
      // Truncate fractional seconds to 3 digits for consistent parsing
      toParse = toParse.replace(/(\.\d{3})\d+/, '$1');
      
      // If no timezone info, assume it's GMT+0 (Pancake default)
      if (!toParse.includes('Z') && !/[+-]\d{2}:?\d{2}$/.test(toParse)) {
        toParse = toParse + 'Z';
      }
      
      const parsed = new Date(toParse);
      if (!Number.isNaN(parsed.getTime())) {
        // Convert GMT+0 to GMT+7 by adding 7 hours
        const vietnamTime = new Date(parsed.getTime() + 7 * 60 * 60 * 1000);
        return vietnamTime.toISOString();
      }
    }

    const dateTimeMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/.exec(normalized) ||
      /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s+(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(normalized);

    if (dateTimeMatch) {
      const isDateFirst = normalized.includes('/') && (normalized.indexOf('/') < normalized.indexOf(':') || normalized.indexOf(':') === -1);
      let day, month, year, hour, minute, second;
      if (isDateFirst) {
        [, day, month, year, hour = '00', minute = '00', second = '00'] = dateTimeMatch;
      } else {
        [, hour, minute, second = '00', day, month, year] = dateTimeMatch;
      }
      
      // Pad single digits
      const pad = (v: any) => String(v).padStart(2, '0');
      // Create date string in ISO format with Vietnam timezone offset
      const isoWithOffset = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}+07:00`;
      const dateObj = new Date(isoWithOffset);
      return Number.isNaN(dateObj.getTime()) ? null : dateObj.toISOString();
    }
    return normalized;
  }

  private normalizeCourierUpdates(updates: any[]) {
    if (!updates || !Array.isArray(updates)) return [];
    return updates.map(u => {
      if (typeof u === 'string') {
        const timeMatch = u.match(/^(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{1,2}(?::\d{1,2})?)/);
        const altTimeMatch = u.match(/^(\d{1,2}:\d{1,2}(?::\d{1,2})?\s+\d{1,2}\/\d{1,2}\/\d{4})/);
        const isoTimeMatch = u.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?)/);
        const timeStr = timeMatch?.[1] || altTimeMatch?.[1] || isoTimeMatch?.[1];
        const status = timeStr ? u.substring(timeStr.length).replace(/^[:\s-]+/, '') : u;
        return {
          status: status || 'Cập nhật',
          note: null,
          address: null,
          update_at: this.parseDate(timeStr) || new Date().toISOString(),
        };
      }
      const timeField = u.updated_at || u.update_at || u.update_time || u.time || u.inserted_at || u.created_at;
      return {
        status: u.status || u.key || 'Cập nhật',
        note: u.note || null,
        address: u.address || u.location || null,
        update_at: this.parseDate(timeField) || timeField || new Date().toISOString(),
      };
    });
  }

  async syncOrdersForUser(phone: string, userId: string, storeId?: string) {
    this.logger.log(`[Pancake] Starting sync for userId: ${userId}, phone: ${phone}`);
    const integrations = await this.getActivePancakeIntegrations(storeId);
    if (integrations.length === 0) return 0;
    const searchTerms = this.buildPhoneSearchTerms(phone);
    if (searchTerms.length === 0) return 0;

    let totalNewSpent = 0;
    let syncedCount = 0;
    let customerInfoSynced = false;
    let totalFetchedOrders = 0;
    const processedOrders = new Set<string>();

    for (const integration of integrations) {
      const orderMap = new Map<string, any>();
      for (const searchTerm of searchTerms) {
        const orders = await this.fetchOrdersByPhone(searchTerm, integration.storeId);
        for (const order of orders) orderMap.set(String(order.id), order);
      }
      totalFetchedOrders += orderMap.size;
      for (const pOrder of orderMap.values()) {
        const dedupeKey = `${integration.storeId}:${pOrder.id}`;
        if (processedOrders.has(dedupeKey)) continue;
        processedOrders.add(dedupeKey);
        try {
          const result = await this.syncSingleOrder(pOrder, integration.storeId, userId);
          if (result.synced) {
            totalNewSpent += result.amount;
            syncedCount++;
            if (!customerInfoSynced) {
              const orderDetail = await this.fetchOrderDetail(pOrder.id, integration.storeId);
              if (orderDetail) {
                const custInfo = this.extractCustomerInfo(orderDetail);
                if (custInfo.name || custInfo.fullAddress) {
                  await this.syncUserProfile(userId, custInfo);
                  customerInfoSynced = true;
                }
              }
            }
          }
        } catch (error) {
          this.logger.error(`[Pancake] Error in syncOrdersForUser for order ${pOrder.id}:`, error);
        }
      }
    }
    return totalNewSpent;
  }

  private async syncUserProfile(userId: string, custInfo: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    const updateData: Record<string, any> = {};
    if (!user.name || user.name === user.phone) if (custInfo.name) updateData.name = custInfo.name;
    if (!user.email && custInfo.email) updateData.email = custInfo.email;
    if (!user.gender && custInfo.gender) updateData.gender = custInfo.gender;
    if (!user.dob && custInfo.dob) {
      let dateObj = new Date(custInfo.dob);
      if (isNaN(dateObj.getTime()) && (custInfo.dob.includes('/') || custInfo.dob.includes('-'))) {
        const parts = custInfo.dob.split(/[/|-]/);
        if (parts.length === 3) dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
      if (!isNaN(dateObj.getTime())) updateData.dob = dateObj;
    }
    if (!user.address && custInfo.fullAddress) updateData.address = custInfo.fullAddress;
    if (!user.addressStreet && custInfo.street) updateData.addressStreet = custInfo.street;
    if (!user.addressProvince && custInfo.province) updateData.addressProvince = custInfo.province;
    if (!user.addressWard && custInfo.ward) updateData.addressWard = custInfo.ward;
    updateData.addressDistrict = null;
    if (Object.keys(updateData).length > 0) {
      await this.prisma.user.update({ where: { id: userId }, data: updateData });
    }
  }

  private async updateUserRankAndSpent(userId: string, _addedSpent?: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    const result = await this.prisma.order.aggregate({
      where: { userId, status: { in: ['COMPLETED', 'DELIVERED', 'PAYMENT_COLLECTED'] } },
      _sum: { totalAmount: true },
    });
    const newTotalSpent = result._sum.totalAmount || 0;
    await this.prisma.user.update({ where: { id: userId }, data: { totalSpent: newTotalSpent } });
    await this.usersService.updateUserRank(userId);
  }

  async fetchCategories(storeId?: string) {
    const config = await this.getPancakeConfig(storeId);
    if (!config) return [];
    try {
      const url = `https://pos.pages.fm/api/v1/shops/${config.shopId}/categories?api_key=${config.apiKey}`;
      const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!response.ok) return [];
      const data = await response.json();
      return data.success && Array.isArray(data.data) ? data.data : [];
    } catch (error) {
      return [];
    }
  }

  async syncAllCategories(storeId?: string) {
    const categories = await this.fetchCategories(storeId);
    if (categories.length === 0) return { synced: 0, errors: 0 };
    let totalSynced = 0;
    let totalErrors = 0;
    for (const category of categories) {
      try {
        await this.syncCategoryRecursive(category, null);
        totalSynced++;
      } catch (error) {
        totalErrors++;
      }
    }
    return { synced: totalSynced, errors: totalErrors };
  }

  private async syncCategoryRecursive(pCategory: any, parentId: string | null) {
    const slug = pCategory.text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[dđ]/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + `-${pCategory.id}`;
    const existingCategory = await this.prisma.category.findFirst({ where: { OR: [{ externalId: String(pCategory.id) }, { slug }] } });
    const categoryData = { name: pCategory.text, slug, parentId, externalId: String(pCategory.id), isActive: true };
    let category;
    if (existingCategory) {
      category = await this.prisma.category.update({ where: { id: existingCategory.id }, data: categoryData });
    } else {
      category = await this.prisma.category.create({ data: categoryData });
    }
    if (pCategory.nodes && Array.isArray(pCategory.nodes) && pCategory.nodes.length > 0) {
      for (const childCategory of pCategory.nodes) await this.syncCategoryRecursive(childCategory, category.id);
    }
    return category;
  }

  async fetchProducts(page = 1, pageSize = 100, storeId?: string) {
    const config = await this.getPancakeConfig(storeId);
    if (!config) return { variations: [], hasMore: false, total: 0 };
    try {
      const url = `https://pos.pages.fm/api/v1/shops/${config.shopId}/products/variations?api_key=${config.apiKey}&page=${page}&page_size=${pageSize}`;
      const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!response.ok) return { variations: [], hasMore: false, total: 0 };
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        return { variations: data.data, hasMore: (data.page_number || page) < (data.total_pages || 0), total: data.total_entries || 0 };
      }
      return { variations: [], hasMore: false, total: 0 };
    } catch (error) {
      return { variations: [], hasMore: false, total: 0 };
    }
  }

  private extractProductInfo(productName: string, itemFields?: any[]) {
    let baseName = productName.replace(/_+/g, ' ');
    let color = null;
    let size = null;
    if (Array.isArray(itemFields)) {
      const sizeField = itemFields.find(f => { const n = String(f?.name || '').toLowerCase(); return n.includes('size') || n.includes('kich') || n.includes('kích'); });
      const colorField = itemFields.find(f => { const n = String(f?.name || '').toLowerCase(); return n.includes('color') || n.includes('mau') || n.includes('màu'); });
      if (sizeField?.value) size = String(sizeField.value).trim().toUpperCase();
      if (colorField?.value) color = String(colorField.value).trim();
    }
    const sizePattern = /\s+(?:Size|size|ize)\s+([X]{1,3}L|2XL|3XL|[LMS]|Freesize|Free\s*size)\b|\s+([X]{1,3}L|[LMS]|Freesize|Free\s*size)\b(?=\s*$)/gi;
    const matches = Array.from(baseName.matchAll(sizePattern));
    if (matches.length > 0 && !size) size = (matches[matches.length - 1][1] || matches[matches.length - 1][2] || '').toUpperCase().trim();
    baseName = baseName.replace(/\s+(?:Size|size|ize)\s+[X]{1,3}L\b/gi, ' ').replace(/\s+(?:Size|size|ize)\s+[LMS]\b/gi, ' ').replace(/\s+[X]{1,3}L\s*$/gi, '').replace(/\s+[LMS]\s*$/gi, '').replace(/\s+(?:Size|size|ize)\b/gi, ' ').trim();
    const colorPattern = /(Đen|Đỏ|Xanh|Trắng|Hồng|Be|Tím|Vàng|Nâu|Xám|Cam)\b/gi;
    const colorMatches = Array.from(baseName.matchAll(colorPattern));
    if (colorMatches.length > 0 && !color) color = colorMatches[0][1];
    if (color) baseName = baseName.replace(new RegExp(`\\b${color}\\b`, 'gi'), ' ').trim();
    baseName = baseName.replace(/\s+/g, ' ').trim();
    return { baseName, color, size };
  }

  async syncAllProducts(storeId?: string) {
    let store = null;
    if (storeId) store = await this.prisma.store.findUnique({ where: { id: storeId } });
    else {
      const integration = await this.prisma.storeIntegration.findFirst({ where: { platform: 'PANCAKE', isActive: true }, include: { store: true } });
      store = integration?.store;
    }
    if (!store) return { synced: 0, errors: 0, total: 0 };

    let page = 1;
    let totalSynced = 0;
    let totalErrors = 0;
    let hasMore = true;
    const productMap = new Map<string, any[]>();

    while (hasMore) {
      const { variations, hasMore: more } = await this.fetchProducts(page, 100, store.id);
      hasMore = more;
      if (variations.length === 0) break;
      for (const variation of variations) {
        const { baseName } = this.extractProductInfo(variation.product?.name || 'Unknown');
        if (!baseName) continue;
        if (!productMap.has(baseName)) productMap.set(baseName, []);
        productMap.get(baseName)!.push(variation);
      }
      page++;
      if (page > 100) break;
    }

    for (const [baseName, variations] of productMap.entries()) {
      try {
        await this.syncProductFromVariations(variations, store.id);
        totalSynced++;
      } catch (error) {
        totalErrors++;
      }
    }
    return { synced: totalSynced, errors: totalErrors, total: productMap.size };
  }

  private async syncProductFromVariations(variations: any[], storeId: string) {
    if (variations.length === 0) return;
    const firstVariation = variations[0];
    const productData = firstVariation.product;
    if (!productData) return;

    const { baseName } = this.extractProductInfo(productData.name);
    const pancakeProductId = baseName.toLowerCase().replace(/\s+/g, '-');
    const slug = baseName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[dđ]/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const totalStock = variations.reduce((sum, v) => sum + Math.max(0, v.remain_quantity || 0), 0);
    let mainImage = productData.image || (firstVariation.images?.[0]) || null;
    const retailPrice = firstVariation.retail_price || 0;
    const salePrice = firstVariation.price_at_counter || retailPrice;

    const existingProduct = await this.prisma.product.findFirst({ where: { externalId: pancakeProductId } });
    const productPayload = { name: baseName, slug, sku: productData.display_id || null, externalId: pancakeProductId, imageUrl: mainImage, description: productData.note_product || productData.note || null, originalPrice: retailPrice, salePrice, stockQuantity: totalStock, weight: 500, isActive: productData.is_published !== false, storeId };

    let product;
    if (existingProduct) product = await this.prisma.product.update({ where: { id: existingProduct.id }, data: productPayload });
    else product = await this.prisma.product.create({ data: productPayload });

    if (productData.categories && Array.isArray(productData.categories)) {
      const categoryIds = productData.categories.map((cat: any) => typeof cat === 'number' ? cat : (cat?.id || null)).filter((id: any) => id !== null);
      if (categoryIds.length > 0) await this.syncProductCategories(product.id, categoryIds);
    }
    await this.syncProductVariations(product.id, variations);
  }

  private async syncProductCategories(productId: string, pancakeCategoryIds: number[]) {
    const categories = await this.prisma.category.findMany({ where: { externalId: { in: pancakeCategoryIds.map(id => String(id)) } } });
    if (categories.length === 0) return;
    const product = await this.prisma.product.findUnique({ where: { id: productId }, include: { categories: true } });
    if (!product) return;
    const categoryIdsToConnect = categories.map(c => c.id);
    const existingCategoryIds = product.categories.map(c => c.id);
    const categoriesToAdd = categoryIdsToConnect.filter(id => !existingCategoryIds.includes(id));
    if (categoriesToAdd.length > 0) {
      await this.prisma.product.update({ where: { id: productId }, data: { categories: { connect: categoriesToAdd.map(id => ({ id })) } } });
    }
  }

  private async syncProductVariations(productId: string, variations: any[]) {
    const variantMap = new Map<string, { sizeId: string | null; colorId: string | null; price: number | null; stock: number }>();
    for (const variation of variations) {
      const { color, size } = this.extractProductInfo(variation.product?.name || '', variation.fields);
      if (!size && !color) continue;
      let sizeId = null, colorId = null;
      if (size) {
        let sizeRecord = await this.prisma.size.findUnique({ where: { name: size } });
        if (!sizeRecord) sizeRecord = await this.prisma.size.create({ data: { name: size } });
        sizeId = sizeRecord.id;
      }
      if (color) {
        let colorRecord = await this.prisma.color.findUnique({ where: { name: color } });
        if (!colorRecord) colorRecord = await this.prisma.color.create({ data: { name: color } });
        colorId = colorRecord.id;
      }
      const stock = Math.max(0, variation.remain_quantity || 0), price = variation.price_at_counter || variation.retail_price || null;
      const key = `${sizeId || 'null'}_${colorId || 'null'}`;
      if (variantMap.has(key)) {
        const e = variantMap.get(key)!; e.stock += stock; if (price && (!e.price || price > e.price)) e.price = price;
      } else variantMap.set(key, { sizeId, colorId, price, stock });
    }
    for (const [, variant] of variantMap) {
      try {
        const existingVariant = await this.prisma.productVariant.findFirst({ where: { productId, sizeId: variant.sizeId, colorId: variant.colorId } });
        if (existingVariant) await this.prisma.productVariant.update({ where: { id: existingVariant.id }, data: { price: variant.price, stock: variant.stock } });
        else await this.prisma.productVariant.create({ data: { productId, sizeId: variant.sizeId, colorId: variant.colorId, price: variant.price, stock: variant.stock } });
      } catch (error: any) {
        if (error.code === 'P2002') {
          const existing = await this.prisma.productVariant.findFirst({ where: { productId, sizeId: variant.sizeId, colorId: variant.colorId } });
          if (existing) await this.prisma.productVariant.update({ where: { id: existing.id }, data: { price: variant.price, stock: variant.stock } });
        }
      }
    }
  }

  async syncAllOrders(storeId?: string, startDate?: string, endDate?: string, dates?: string[], syncAll?: boolean) {
    const integrations = await this.getActivePancakeIntegrations(storeId);
    if (integrations.length === 0) return { synced: 0, errors: 0, total: 0, totalAmount: 0 };
    const dateRanges = syncAll ? [{ start: new Date('2010-01-01'), end: new Date() }] : dates && dates.length > 0 ? Array.from(new Set(dates)).map(date => this.buildDateRange(date)) : startDate && endDate ? [{ start: new Date(startDate), end: new Date(endDate) }] : [this.buildDateRange(new Date().toISOString().slice(0, 10))];
    let totalSynced = 0, totalErrors = 0, totalAmount = 0, totalFetched = 0;
    const processedOrders = new Set<string>();
    for (const integration of integrations) {
      for (const range of dateRanges) {
        const orders = await this.fetchOrdersByDateRangeForIntegration(integration, range.start, range.end);
        totalFetched += orders.length;
        for (const order of orders) {
          const dedupeKey = `${integration.storeId}:${order.id}`;
          if (processedOrders.has(dedupeKey)) continue;
          processedOrders.add(dedupeKey);
          try {
            const result = await this.syncSingleOrder(order, integration.storeId);
            if (result.synced) { totalAmount += result.amount; totalSynced++; }
          } catch (error) { totalErrors++; }
          await new Promise(r => setTimeout(r, 50));
        }
      }
    }
    if (totalSynced > 0) {
      await this.adminNotificationsService.createNotification({ type: 'ORDER', title: `Đồng bộ đơn hàng từ Pancake`, message: `Đã đồng bộ ${totalSynced}/${totalFetched} đơn hàng, tổng ${new Intl.NumberFormat('vi-VN').format(totalAmount)} VND`, link: '/admin/orders', metadata: { synced: totalSynced, errors: totalErrors, total: totalFetched, totalAmount } });
    }
    return { synced: totalSynced, errors: totalErrors, total: totalFetched, totalAmount };
  }

  async syncSingleOrder(pOrder: any, storeId: string, targetUserId?: string) {
    const orderCode = `PCK-${pOrder.id}`;
    const existing = await this.prisma.order.findUnique({ where: { orderCode } });
    const phone = pOrder.bill_phone_number || pOrder.shipping_address?.phone_number;
    if (!phone) return { synced: false, amount: 0 };
    const phoneSearchTerms = this.buildPhoneSearchTerms(phone);
    let user = targetUserId ? await this.prisma.user.findUnique({ where: { id: targetUserId } }) : await this.prisma.user.findFirst({ where: { phone: { in: phoneSearchTerms } } });
    
    if (user && (!user.email && pOrder.bill_email)) {
      await this.prisma.user.update({ where: { id: user.id }, data: { email: pOrder.bill_email } });
    }

    const detailData = (await this.fetchOrderDetail(pOrder.id, storeId)) || pOrder;
    const subtotal = detailData.total_price || pOrder.total_price || 0, 
          shippingFee = detailData.shipping_fee || pOrder.shipping_fee || 0, 
          discount = detailData.total_discount || pOrder.total_discount || 0, 
          surcharge = detailData.surcharge || pOrder.surcharge || 0, 
          totalAmount = subtotal - discount + shippingFee + surcharge;
    
    if (totalAmount <= 0) return { synced: false, amount: 0 };

    const cod = detailData.cod || 0, cash = detailData.cash || 0, transferMoney = detailData.transfer_money || 0, 
          totalPaid = cash + transferMoney + (detailData.charged_by_momo || 0) + (detailData.charged_by_vnpay || 0) + 
                     (detailData.charged_by_card || 0) + (detailData.charged_by_qrpay || 0) + (detailData.charged_by_fundiin || 0) + 
                     (detailData.charged_by_kredivo || 0);
    
    const status = this.mapPancakeOrderStatus(detailData.status || pOrder.status), 
          paymentStatus = totalPaid >= totalAmount && totalAmount > 0 ? 'PAID' : totalPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
    
    const shippingAddr = detailData.shipping_address || pOrder.shipping_address, 
          partner = detailData.partner || pOrder.partner || null;
    
    const orderItemsData = [];
    for (const item of (detailData.items || pOrder.items || [])) {
      const { baseName, color, size } = this.extractProductInfo(item.variation_info?.name || item.name || '', item.variation_info?.fields);
      if (!baseName) continue;
      
      const matchingProduct = await this.prisma.product.findFirst({ 
        where: { storeId, OR: [{ externalId: baseName.toLowerCase().replace(/\s+/g, '-') }, { name: { contains: baseName } }] } 
      });
      
      if (matchingProduct) {
        orderItemsData.push({ 
          productId: matchingProduct.id, 
          quantity: item.quantity || 1, 
          price: item.variation_info?.retail_price || item.price || 0, 
          isGift: item.is_bonus_product || false, 
          size, 
          color 
        });
      }
    }

    const metadata: Record<string, any> = {
      items: this.extractItemsMetadata(detailData.items || pOrder.items || []),
      pancakeOrderId: pOrder.id,
      pancakeDisplayId: detailData.display_id || pOrder.display_id || null,
      pancakeStatus: detailData.status ?? pOrder.status,
      pancakeStatusName: detailData.status_name || pOrder.status_name || null,
      pancakeCreatedAt: this.parseDate(detailData.inserted_at || pOrder.inserted_at) || null,
      pancakeUpdatedAt: this.parseDate(detailData.updated_at || pOrder.updated_at) || null,
      customer: {
        name: pOrder.bill_full_name || detailData.bill_full_name || null,
        phone: pOrder.bill_phone_number || detailData.bill_phone_number || null,
        email: pOrder.bill_email || detailData.bill_email || null,
        fbId: detailData.customer?.fb_id || null,
        pancakeCustomerId: detailData.customer?.id || null,
      },
      shippingAddress: shippingAddr ? {
        fullName: shippingAddr.full_name || null,
        phoneNumber: shippingAddr.phone_number || null,
        address: shippingAddr.address || null,
        fullAddress: shippingAddr.full_address || null,
      } : null,
      partner: partner ? {
        partnerId: partner.partner_id || null,
        trackingCode: partner.extend_code || null,
        deliveryName: partner.delivery_name || null,
        deliveryPhone: partner.delivery_tel || null,
        totalFee: partner.total_fee || null,
        cod: partner.cod || null,
        sortCode: partner.sort_code || null,
        pickedUpAt: partner.picked_up_at ? this.parseDate(partner.picked_up_at) : null,
        paidAt: partner.paid_at ? this.parseDate(partner.paid_at) : null,
        courierUpdates: this.normalizeCourierUpdates(partner.partner_shipping_updates || partner.extend_update || detailData.partner_shipping_updates || []),
      } : null,
      payment: {
        totalPaid,
        cod: detailData.cod || 0,
        cash: detailData.cash || 0,
        transferMoney: detailData.transfer_money || 0,
        chargedByMomo: detailData.charged_by_momo || 0,
        chargedByVnpay: detailData.charged_by_vnpay || 0,
        chargedByCard: detailData.charged_by_card || 0,
        chargedByQrpay: detailData.charged_by_qrpay || 0,
        chargedByFundiin: detailData.charged_by_fundiin || 0,
        chargedByKredivo: detailData.charged_by_kredivo || 0,
        prepaidByPoint: detailData.prepaid_by_point || null,
        bankTransferImages: detailData.bank_transfer_images || null,
        moneyToCollect: detailData.money_to_collect || 0,
      },
      financial: { subtotal, discount, shippingFee, surcharge, totalAmount },
      source: {
        accountName: detailData.account_name || null,
        pageId: detailData.page_id || null,
        postId: detailData.post_id || null,
        isFromEcommerce: detailData.is_from_ecommerce || false,
        isLivestream: detailData.is_livestream || false,
        receivedAtShop: detailData.received_at_shop || false,
      },
      warehouseInfo: detailData.warehouse_info ? {
        name: detailData.warehouse_info.name || null,
        phone_number: detailData.warehouse_info.phone_number || null,
        address: detailData.warehouse_info.address || null,
        full_address: detailData.warehouse_info.full_address || null,
      } : null,
      tags: detailData.tags && Array.isArray(detailData.tags) ? detailData.tags : [],
      creator: detailData.creator ? {
        id: detailData.creator.id || null,
        name: detailData.creator.name || null,
        email: detailData.creator.email || null,
        fbId: detailData.creator.fb_id || null,
      } : null,
      marketer: detailData.marketer ? {
        id: detailData.marketer.id || null,
        name: detailData.marketer.name || null,
        email: detailData.marketer.email || null,
        fbId: detailData.marketer.fb_id || null,
      } : null,
      assigningSeller: detailData.assigning_seller ? {
        id: detailData.assigning_seller.id || null,
        name: detailData.assigning_seller.name || null,
        email: detailData.assigning_seller.email || null,
        fbId: detailData.assigning_seller.fb_id || null,
      } : null,
      assigningCare: detailData.assigning_care ? {
        id: detailData.assigning_care.id || null,
        name: detailData.assigning_care.name || null,
        email: detailData.assigning_care.email || null,
        fbId: detailData.assigning_care.fb_id || null,
      } : null,
      reportsByPhone: detailData.reports_by_phone || null,
      trackingLink: detailData.tracking_link || null,
    };

    const pancakeCreatedAt = detailData.inserted_at || pOrder.inserted_at;
    const orderCreatedAt = this.parsePancakeDate(pancakeCreatedAt) || new Date();
    const pancakeUpdatedAt = detailData.updated_at || pOrder.updated_at || null;
    const orderUpdatedAt = this.parsePancakeDate(pancakeUpdatedAt) || new Date();
    
    let order;
    try {
      if (existing) {
        await this.prisma.orderItem.deleteMany({ where: { orderId: existing.id } });
        order = await this.prisma.order.update({
          where: { id: existing.id },
          data: {
            userId: existing.userId || user?.id || null,
            shippingName: shippingAddr?.full_name || pOrder.bill_full_name || null,
            shippingPhone: shippingAddr?.phone_number || pOrder.bill_phone_number || null,
            shippingStreet: shippingAddr?.address || null,
            subtotal,
            discountAmount: discount,
            shippingFee,
            totalAmount,
            status,
            paymentStatus,
            metadata,
            storeId,
            updatedAt: orderUpdatedAt,
            items: orderItemsData.length > 0 ? { create: orderItemsData } : undefined,
          }
        });
      } else {
        order = await this.prisma.order.create({
          data: {
            userId: user?.id || null,
            orderCode,
            source: 'PANCAKE',
            shippingName: shippingAddr?.full_name || pOrder.bill_full_name || null,
            shippingPhone: shippingAddr?.phone_number || pOrder.bill_phone_number || null,
            shippingStreet: shippingAddr?.address || null,
            subtotal,
            discountAmount: discount,
            shippingFee,
            totalAmount,
            status,
            paymentStatus,
            metadata,
            storeId,
            createdAt: orderCreatedAt,
            updatedAt: orderUpdatedAt,
            items: orderItemsData.length > 0 ? { create: orderItemsData } : undefined,
          }
        });
      }
    } catch (err) {
      this.logger.error(`[Pancake] Error ${existing ? 'updating' : 'creating'} order ${orderCode}: ${err.message}`);
      return { synced: false, amount: 0, error: err.message };
    }

    const isCreditable = status === 'COMPLETED' || status === 'DELIVERED', wasCreditable = existing && (existing.status === 'COMPLETED' || existing.status === 'DELIVERED');
    if (isCreditable && user && (!existing || !wasCreditable)) await this.updateUserRankAndSpent(user.id, totalAmount);
    else if (!isCreditable && wasCreditable && user) await this.updateUserRankAndSpent(user.id, -totalAmount);
    
    return { synced: true, amount: totalAmount, orderId: order.id, isUpdate: !!existing, status: order.status, previousStatus: existing?.status || null };
  }

  private parsePancakeDate(value?: string | Date | null): Date | null {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    const n = value.trim();
    let tp = n;
    if (/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/.test(n)) {
      if (!n.includes('Z') && !/[+-]\d{2}:?\d{2}$/.test(n)) {
        tp = n.replace(' ', 'T') + 'Z';
      } else {
        tp = n.replace(' ', 'T');
      }
      // Truncate fractional seconds to 3 digits
      tp = tp.replace(/(\.\d{3})\d+(Z?)$/, '$1$2');
    }
    const p = new Date(tp);
    return isNaN(p.getTime()) ? null : p;
  }

  private mapPancakeOrderStatus(pancakeStatus: number | string): OrderStatus {
    const s = typeof pancakeStatus === 'string' ? parseInt(pancakeStatus) : pancakeStatus;
    const m: Record<number, OrderStatus> = { 0: OrderStatus.PENDING, 17: OrderStatus.PENDING, 11: OrderStatus.WAITING_FOR_GOODS, 20: OrderStatus.CONFIRMED, 1: OrderStatus.CONFIRMED, 12: OrderStatus.CONFIRMED, 13: OrderStatus.CONFIRMED, 8: OrderStatus.PACKAGING, 9: OrderStatus.WAITING_FOR_SHIPPING, 2: OrderStatus.SHIPPED, 3: OrderStatus.DELIVERED, 16: OrderStatus.PAYMENT_COLLECTED, 4: OrderStatus.RETURNING, 15: OrderStatus.RETURNING, 5: OrderStatus.REFUNDED, 6: OrderStatus.CANCELLED, 7: OrderStatus.CANCELLED };
    return m[s] || OrderStatus.PENDING;
  }

  async handleWebhookEvent(payload: any, shopId?: string) {
    const type = payload.type || payload.event_type, data = payload.data || payload;
    switch (type) {
      case 'orders': case 'order': return await this.handleOrderWebhook(data, shopId);
      case 'customers': case 'customer': return await this.handleCustomerWebhook(data, shopId);
      case 'products': case 'product': return await this.handleProductWebhook(data, shopId);
      case 'variations_warehouses': case 'inventory': return await this.handleInventoryWebhook(data, shopId);
      default: return { processed: false };
    }
  }

  private async handleOrderWebhook(orderData: any, shopId?: string) {
    const integration = await this.prisma.storeIntegration.findFirst({ where: { platform: 'PANCAKE', isActive: true, ...(shopId ? { shopId } : {}) }, include: { store: true } });
    if (!integration?.store) return { processed: false };
    const result = await this.syncSingleOrder(orderData, integration.store.id);
    if (result.synced) {
      const orderCode = `PCK-${orderData.id}`, existing = await this.prisma.order.findFirst({ where: { orderCode } });
      const statusLabelMap: Record<string, string> = {
        PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', WAITING_FOR_GOODS: 'Chờ hàng',
        PACKAGING: 'Đang đóng gói', WAITING_FOR_SHIPPING: 'Chờ vận chuyển', SHIPPED: 'Đang giao hàng',
        DELIVERED: 'Đã nhận hàng', PAYMENT_COLLECTED: 'Đã thu tiền', COMPLETED: 'Hoàn thành',
        CANCELLED: 'Đã hủy', REFUNDED: 'Hoàn trả', RETURNING: 'Đang hoàn',
      };
      let nMessage: string;
      if (result.isUpdate && result.previousStatus && result.previousStatus !== result.status) {
        const oldLabel = statusLabelMap[result.previousStatus] || result.previousStatus;
        const newLabel = statusLabelMap[result.status] || result.status;
        nMessage = `${oldLabel} → ${newLabel}`;
      } else {
        const newLabel = statusLabelMap[result.status] || result.status;
        nMessage = result.isUpdate ? `Trạng thái: ${newLabel}` : `Đơn mới - ${newLabel}`;
      }
      await this.adminNotificationsService.createNotification({ type: 'ORDER', title: `Đơn hàng ${orderCode} ${result.isUpdate ? 'cập nhật' : 'mới'}`, message: nMessage, link: existing ? `/admin/orders/${existing.id}` : '/admin/orders' });
    }
    return { processed: true };
  }

  private async handleCustomerWebhook(customerData: any, shopId?: string) {
    const phone = customerData.phone_number || customerData.phone;
    if (!phone) return { processed: false };
    const user = await this.prisma.user.findFirst({ where: { phone } });
    if (!user) return { processed: false };
    const update: any = {};
    if (customerData.name && !user.name) update.name = customerData.name;
    if (customerData.email && !user.email) update.email = customerData.email;
    if (Object.keys(update).length > 0) await this.prisma.user.update({ where: { id: user.id }, data: update });
    return { processed: true };
  }

  private async handleProductWebhook(productData: any, shopId?: string) {
    const integration = await this.prisma.storeIntegration.findFirst({ where: { platform: 'PANCAKE', isActive: true, ...(shopId ? { shopId } : {}) } });
    if (integration?.storeId) this.syncAllProducts(integration.storeId).catch(() => {});
    return { processed: true };
  }

  private async handleInventoryWebhook(inventoryData: any, shopId?: string) {
    const integration = await this.prisma.storeIntegration.findFirst({ where: { platform: 'PANCAKE', isActive: true, ...(shopId ? { shopId } : {}) } });
    if (integration?.storeId) this.syncAllProducts(integration.storeId).catch(() => {});
    return { processed: true };
  }

  async configureWebhook(webhookUrl: string, webhookTypes: string[] = ['orders', 'customers'], storeId?: string) {
    const config = await this.getPancakeConfig(storeId);
    if (!config) throw new Error('Pancake configuration not found');
    const response = await fetch(`https://pos.pages.fm/api/v1/shops/${config.shopId}?api_key=${config.apiKey}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shop: { webhook_enable: true, webhook_url: webhookUrl, webhook_types: webhookTypes, webhook_headers: { 'X-API-KEY': config.apiKey, 'Content-Type': 'application/json' } } }) });
    const data = await response.json();
    if (data.success) return { success: true, webhookUrl };
    throw new Error('Failed to configure webhook');
  }

  async getWebhookConfig(storeId?: string) {
    const config = await this.getPancakeConfig(storeId);
    if (!config) throw new Error('Pancake configuration not found');
    const response = await fetch(`https://pos.pages.fm/api/v1/shops/${config.shopId}?api_key=${config.apiKey}`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    const data = await response.json();
    if (data.success && data.data) {
      const s = data.data; return { enabled: s.webhook_enable || false, url: s.webhook_url || null, types: s.webhook_types || [] };
    }
    return null;
  }
}
