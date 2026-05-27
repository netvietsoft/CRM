import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { OrdersModule } from './orders/orders.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { StoresModule } from './stores/stores.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { CartModule } from './cart/cart.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SpinModule } from './spin/spin.module';
import { CommissionsModule } from './commissions/commissions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AddressModule } from './address/address.module';
import { ColorsModule } from './colors/colors.module';
import { SizesModule } from './sizes/sizes.module';
import { CommissionConfigModule } from './commission-config/commission-config.module';
import { AdminModule } from './admin/admin.module';
import { AdminNotificationsModule } from './modules/admin-notifications/admin-notifications.module';
import { SupportModule } from './support/support.module';
import { MessagingModule } from './messaging/messaging.module';
import { RankConfigModule } from './rank-config/rank-config.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { MaterialsModule } from './materials/materials.module';
import { UnitsModule } from './units/units.module';
import { ProductTagsModule } from './product-tags/product-tags.module';

const logger = new Logger('AppModule');

function getQueueModules(): any[] {
  const redisHost = process.env.REDIS_HOST;
  const redisUrl = process.env.REDIS_URL;

  if (!redisHost && !redisUrl) {
    logger.warn(
      '⚠️  Redis not configured - BullMQ queues disabled. Voucher verification and background jobs will not work.',
    );
    logger.warn('⚠️  To enable queues, set REDIS_HOST or REDIS_URL in .env file');
    return [];
  }

  logger.log('✅ Redis configured - BullMQ queues enabled');

  return [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConnectionUrl = configService.get<string>('REDIS_URL');

        if (redisConnectionUrl) {
          return {
            connection: {
              url: redisConnectionUrl,
            },
          };
        }

        return {
          connection: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
            password: configService.get('REDIS_PASSWORD'),
            db: configService.get('REDIS_DB', 0),
          },
        };
      },
    }),
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
  ];
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    ...getQueueModules(),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    OrdersModule,
    VouchersModule,
    WebhooksModule,
    StoresModule,
    IntegrationsModule,
    CartModule,
    WishlistModule,
    ReviewsModule,
    SpinModule,
    CommissionsModule,
    NotificationsModule,
    AddressModule,
    ColorsModule,
    SizesModule,
    CommissionConfigModule,
    AdminModule,
    AdminNotificationsModule,
    SupportModule,
    MessagingModule,
    RankConfigModule,
    SuppliersModule,
    MaterialsModule,
    UnitsModule,
    ProductTagsModule,
  ],
})
export class AppModule {}
