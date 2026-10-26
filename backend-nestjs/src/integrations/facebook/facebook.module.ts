import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FacebookOAuthClient } from './facebook-oauth.client';
import { FacebookDiscoveryService } from './facebook-discovery.service';
import { FacebookService } from './facebook.service';
import { FacebookOAuthController } from './facebook-oauth.controller';
import { MetaCatalogService } from './meta-catalog.service';

@Module({
  imports: [PrismaModule],
  controllers: [FacebookOAuthController],
  providers: [FacebookOAuthClient, FacebookDiscoveryService, FacebookService, MetaCatalogService],
  exports: [FacebookService, MetaCatalogService],
})
export class FacebookModule {}

