import { config } from 'dotenv';
config({ path: '.env' });

import { MessageChannelCode, MessageTemplateKind, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const phone = '0909090909';
  const password = 'admin123*';
  const name = 'admin';

  const hashedPassword = await bcrypt.hash(password, 10);
  const channels = [
    {
      code: MessageChannelCode.SMS,
      name: 'SMS',
      description: 'Kenh nhan tin SMS uu tien trien khai hien tai',
      isActive: true,
    },
    {
      code: MessageChannelCode.ZALO,
      name: 'Zalo',
      description: 'Kenh Zalo Official Account, chua kich hoat',
      isActive: false,
    },
    {
      code: MessageChannelCode.MESSENGER,
      name: 'Messenger',
      description: 'Kenh Facebook Messenger, chua kich hoat',
      isActive: false,
    },
    {
      code: MessageChannelCode.WHATSAPP,
      name: 'WhatsApp',
      description: 'Kenh WhatsApp, chua kich hoat',
      isActive: false,
    },
    {
      code: MessageChannelCode.TIKTOK,
      name: 'TikTok',
      description: 'Kenh TikTok, chua kich hoat',
      isActive: false,
    },
    {
      code: MessageChannelCode.SHOPEE,
      name: 'Shopee',
      description: 'Kenh Shopee, chua kich hoat',
      isActive: false,
    },
  ];

  await Promise.all(
    channels.map((channel) =>
      prisma.messageChannel.upsert({
        where: { code: channel.code },
        update: {
          name: channel.name,
          description: channel.description,
          isActive: channel.isActive,
        },
        create: channel,
      }),
    ),
  );

  const smsChannel = await prisma.messageChannel.findUnique({
    where: { code: MessageChannelCode.SMS },
    select: { id: true },
  });

  const smsApiUser = process.env.SMS_API_USER?.trim();
  const smsApiPass = process.env.SMS_API_PASS?.trim();
  const smsApiBrandName = process.env.SMS_API_BRANDNAME?.trim();
  const smsApiUrl = process.env.SMS_API_URL?.trim() || 'http://125.212.226.79:9020/service/sms_api';

  if (smsChannel && smsApiUser && smsApiPass && smsApiBrandName) {
    const existingSmsProviderConfig = await prisma.messageProviderConfig.findFirst({
      where: {
        channelId: smsChannel.id,
        providerKey: 'NETVIET_SMS_HTTP',
        storeId: null,
      },
      select: { id: true },
    });

    if (existingSmsProviderConfig) {
      await prisma.messageProviderConfig.update({
        where: { id: existingSmsProviderConfig.id },
        data: {
          name: 'Default SMS Provider',
          settings: {
            apiUrl: smsApiUrl,
            brandName: smsApiBrandName,
          },
          secretSettings: {
            user: smsApiUser,
            pass: smsApiPass,
          },
          isActive: true,
          isDefault: true,
        },
      });
    } else {
      await prisma.messageProviderConfig.create({
        data: {
          channelId: smsChannel.id,
          storeId: null,
          name: 'Default SMS Provider',
          providerKey: 'NETVIET_SMS_HTTP',
          settings: {
            apiUrl: smsApiUrl,
            brandName: smsApiBrandName,
          },
          secretSettings: {
            user: smsApiUser,
            pass: smsApiPass,
          },
          isActive: true,
          isDefault: true,
        },
      });
    }
  }

  if (smsChannel) {
    const smsTemplates = [
      {
        name: 'SMS xác nhận đơn hàng',
        kind: MessageTemplateKind.PRESET,
        content:
          'CHY xác nhận đơn {{order_code}} của {{customer_name}} đã được tiếp nhận. Sản phẩm: {{product_summary}}. Tổng thanh toán: {{total_amount}}. Shop: {{store_name}}.',
        variables: [
          'customer_name',
          'phone',
          'order_code',
          'total_amount',
          'product_summary',
          'store_name',
        ],
        metadata: {
          description: 'Mẫu SMS xác nhận đơn hàng sau khi tạo đơn thành công',
        },
      },
      {
        name: 'SMS cảm ơn sau mua',
        kind: MessageTemplateKind.PRESET,
        content:
          'CHY cảm ơn {{customer_name}}. Đơn {{order_code}} đã hoàn tất. Hạng hiện tại: {{customer_rank}}. Tổng đơn đã mua: {{order_count}}. Hẹn gặp lại bạn tại {{store_name}}.',
        variables: [
          'customer_name',
          'phone',
          'order_code',
          'customer_rank',
          'order_count',
          'store_name',
        ],
        metadata: {
          description: 'Mẫu SMS cảm ơn khách hàng sau khi hoàn tất mua hàng',
        },
      },
      {
        name: 'SMS chúc mừng sinh nhật',
        kind: MessageTemplateKind.PRESET,
        content:
          'CHY chúc {{customer_name}} sinh nhật vui vẻ. Cảm ơn bạn đã đồng hành cùng {{store_name}}. Hạng hiện tại của bạn là {{customer_rank}}. Mong sớm gặp lại bạn.',
        variables: ['customer_name', 'phone', 'store_name', 'customer_rank'],
        metadata: {
          description: 'Mẫu SMS chúc mừng sinh nhật khách hàng',
        },
      },
    ];

    for (const template of smsTemplates) {
      const existingSmsTemplate = await prisma.messageTemplate.findFirst({
        where: {
          channelId: smsChannel.id,
          storeId: null,
          name: template.name,
        },
        select: { id: true },
      });

      const templateData = {
        channelId: smsChannel.id,
        storeId: null,
        name: template.name,
        kind: template.kind,
        content: template.content,
        variables: template.variables,
        metadata: template.metadata,
        isActive: true,
      };

      if (existingSmsTemplate) {
        await prisma.messageTemplate.update({
          where: { id: existingSmsTemplate.id },
          data: templateData,
        });
      } else {
        await prisma.messageTemplate.create({
          data: templateData,
        });
      }
    }
  }

  const admin = await prisma.user.upsert({
    where: { phone },
    update: {
      password: hashedPassword,
      name: name,
      role: 'ADMIN',
    },
    create: {
      phone,
      name,
      password: hashedPassword,
      role: 'ADMIN',
      referralCode: 'ADMIN_' + Date.now().toString(36),
    },
  });

  console.log(`[SEED] Message channels ensured: ${channels.length}`);
  console.log('[SEED] Default SMS provider config ensured when SMS env is available');
  console.log('[SEED] Default SMS templates ensured: 3');
  console.log(`[SEED] Admin account ensured: ${admin.phone}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
