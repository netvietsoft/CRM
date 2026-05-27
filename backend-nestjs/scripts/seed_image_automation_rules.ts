import * as dotenv from 'dotenv';
import * as path from 'path';
import { MessageAutomationTriggerType, Prisma, PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

type RuleSeed = {
  name: string;
  triggerType: MessageAutomationTriggerType;
  messageContent: string;
  triggerConfig?: Record<string, unknown>;
  audienceFilter?: Record<string, unknown>;
};

const ORDER_LIKE_DEFAULTS = {
  skipPartialOrders: true,
  skipExchangeOrders: true,
};

const RULE_SEEDS: RuleSeed[] = [
  {
    name: '[AUTO] Khach hang moi tao tai khoan',
    triggerType: 'CUSTOMER_CREATED',
    messageContent:
      'CHY xin chao {{recipient_name}}. Tai khoan cua ban da duoc tao thanh cong. Dang nhap de nhan uu dai danh rieng cho khach moi.',
  },
  {
    name: '[AUTO] Don hang moi tao',
    triggerType: 'ORDER_CREATED',
    messageContent:
      'CHY da tiep nhan don {{order_code}}. Tong tam tinh: {{order_total_amount}}. Chung toi se cap nhat trang thai som nhat.',
    triggerConfig: ORDER_LIKE_DEFAULTS,
  },
  {
    name: '[AUTO] Don hang da xac nhan',
    triggerType: 'ORDER_CONFIRMED',
    messageContent:
      'Don {{order_code}} da duoc xac nhan. CHY dang chuan bi hang va se gui cap nhat tiep theo cho ban.',
    triggerConfig: ORDER_LIKE_DEFAULTS,
  },
  {
    name: '[AUTO] Don hang da gui',
    triggerType: 'ORDER_SHIPPED',
    messageContent:
      'Don {{order_code}} dang duoc van chuyen. Ban vui long giu dien thoai de don vi giao hang lien he.',
    triggerConfig: ORDER_LIKE_DEFAULTS,
  },
  {
    name: '[AUTO] Don giao thanh cong',
    triggerType: 'ORDER_DELIVERED',
    messageContent:
      'Don {{order_code}} da giao thanh cong. Cam on ban da mua sam tai CHY. Moi danh gia trai nghiem cua ban.',
    triggerConfig: {
      skipPartialOrders: true,
      skipExchangeOrders: true,
      allowedOrderStatuses: ['DELIVERED', 'PAYMENT_COLLECTED', 'COMPLETED'],
    },
  },
  {
    name: '[AUTO] Don giao mot phan',
    triggerType: 'ORDER_PARTIAL_DELIVERED',
    messageContent:
      'Don {{order_code}} da giao mot phan. CHY da cap nhat gia tri voucher va don hang theo ket qua giao thuc te.',
    triggerConfig: {
      skipPartialOrders: false,
      skipExchangeOrders: true,
      allowedOrderStatuses: ['DELIVERED', 'PAYMENT_COLLECTED', 'COMPLETED'],
    },
  },
  {
    name: '[AUTO] Don hang bi huy',
    triggerType: 'ORDER_CANCELLED',
    messageContent:
      'Don {{order_code}} da duoc huy. Neu ban can ho tro dat lai don, vui long lien he CHY.',
    triggerConfig: {
      skipPartialOrders: false,
      skipExchangeOrders: false,
      allowedOrderStatuses: ['CANCELLED', 'REFUNDED'],
    },
  },
  {
    name: '[AUTO] Thanh toan thanh cong',
    triggerType: 'PAYMENT_SUCCESS',
    messageContent:
      'CHY da nhan thanh toan thanh cong cho don {{order_code}}. Cam on ban da hoan tat giao dich.',
    triggerConfig: ORDER_LIKE_DEFAULTS,
  },
  {
    name: '[AUTO] Thanh toan that bai',
    triggerType: 'PAYMENT_FAILED',
    messageContent:
      'Thanh toan cho don {{order_code}} chua thanh cong. Ban co the thu lai hoac chon phuong thuc khac.',
    triggerConfig: {
      skipPartialOrders: false,
      skipExchangeOrders: false,
      allowedOrderStatuses: ['CANCELLED', 'REFUNDED'],
    },
  },
  {
    name: '[AUTO] Voucher duoc tao cho khach',
    triggerType: 'VOUCHER_CREATED',
    messageContent:
      'CHY vua tao voucher {{voucher_code}} danh cho ban. Gia tri uu dai: {{voucher_value}}. Kiem tra ngay trong tai khoan cua ban.',
  },
  {
    name: '[AUTO] Voucher duoc kich hoat',
    triggerType: 'VOUCHER_ACTIVATED',
    messageContent:
      'Voucher {{voucher_code}} da san sang su dung. Ap dung cho don tu {{voucher_min_order_value}}.',
  },
  {
    name: '[AUTO] Voucher da duoc su dung',
    triggerType: 'VOUCHER_USED',
    messageContent:
      'Voucher {{voucher_code}} da duoc ap dung thanh cong cho don cua ban. Cam on ban da mua hang tai CHY.',
  },
  {
    name: '[AUTO] Voucher sap het han 3 ngay',
    triggerType: 'VOUCHER_EXPIRING_3D',
    messageContent:
      'Voucher {{voucher_code}} se het han trong 3 ngay toi. Ban tranh thu su dung de khong bo lo uu dai.',
  },
  {
    name: '[AUTO] Voucher da het han',
    triggerType: 'VOUCHER_EXPIRED',
    messageContent:
      'Voucher {{voucher_code}} da het han. Theo doi them uu dai moi tren tai khoan CHY cua ban.',
  },
  {
    name: '[AUTO] Chuc mung sinh nhat trong ngay',
    triggerType: 'BIRTHDAY_TODAY',
    messageContent:
      'CHY chuc mung sinh nhat {{recipient_name}}. Chuc ban mot ngay that vui va nhieu uu dai hap dan.',
  },
  {
    name: '[AUTO] Khach ngu dong 30 ngay',
    triggerType: 'CUSTOMER_INACTIVE_30D',
    messageContent:
      'Da 30 ngay ban chua mua hang tai CHY. Quay lai ngay hom nay de xem cac uu dai moi nhat danh rieng cho ban.',
  },
  {
    name: '[AUTO] Khach ngu dong 60 ngay',
    triggerType: 'CUSTOMER_INACTIVE_60D',
    messageContent:
      'Da 60 ngay ban chua quay lai CHY. Chung toi da san sang nhung uu dai dac biet de chao don ban tro lai.',
  },
];

function toJsonValue(value: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function main() {
  const smsChannel = await prisma.messageChannel.findFirst({
    where: {
      code: 'SMS',
      isActive: true,
    },
    select: { id: true },
  });

  if (!smsChannel) {
    throw new Error('SMS channel is not configured or inactive');
  }

  const results: Array<{ name: string; action: 'created' | 'updated'; id: string }> = [];

  for (const seed of RULE_SEEDS) {
    const existing = await prisma.messageAutomationRule.findFirst({
      where: { name: seed.name },
      select: { id: true },
    });

    if (existing) {
      const updated = await prisma.messageAutomationRule.update({
        where: { id: existing.id },
        data: {
          channelId: smsChannel.id,
          triggerType: seed.triggerType,
          triggerConfig: toJsonValue(seed.triggerConfig || {}),
          audienceFilter: toJsonValue(seed.audienceFilter || {}),
          metadata: {
            messageContent: seed.messageContent,
          } as Prisma.InputJsonValue,
          isActive: true,
        },
        select: { id: true },
      });
      results.push({ name: seed.name, action: 'updated', id: updated.id });
      continue;
    }

    const created = await prisma.messageAutomationRule.create({
      data: {
        channelId: smsChannel.id,
        name: seed.name,
        triggerType: seed.triggerType,
        triggerConfig: toJsonValue(seed.triggerConfig || {}),
        audienceFilter: toJsonValue(seed.audienceFilter || {}),
        metadata: {
          messageContent: seed.messageContent,
        } as Prisma.InputJsonValue,
        isActive: true,
      },
      select: { id: true },
    });
    results.push({ name: seed.name, action: 'created', id: created.id });
  }

  console.log(JSON.stringify({ count: results.length, results }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
