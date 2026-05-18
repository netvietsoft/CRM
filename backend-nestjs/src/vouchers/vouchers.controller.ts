import { Controller, Get, Post, Body, Patch, Delete, Param, UseGuards, Query } from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permissions.enum';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { GetEffectiveStoreId } from '../auth/decorators/get-effective-store-id.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ClaimQRVoucherDto } from './dto/claim-qr-voucher.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Vouchers')
@Controller('vouchers')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all active vouchers' })
  async findAll(@Query('storeId') storeId?: string) {
    return this.vouchersService.findAll(storeId);
  }

  @Get('order-vouchers')
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.VOUCHERS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all order-specific vouchers' })
  async getOrderVouchersList(
    @GetUser() user: any,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
  ) {
    return this.vouchersService.getOrderVouchersList(user, effectiveStoreId);
  }

  @Get('admin')
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.VOUCHERS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all vouchers for Admin' })
  async findAllAdmin(
    @GetUser() user: any,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Query('excludeGamification') excludeGamification?: string,
  ) {
    return this.vouchersService.findAllAdmin(excludeGamification === 'true', user, effectiveStoreId);
  }

  @Get('user/my-vouchers')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user vouchers' })
  async getMyVouchers(@GetUser('id') userId: string) {
    return this.vouchersService.getUserVouchers(userId);
  }

  @Get('referral-vouchers')
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.VOUCHERS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all referral vouchers for admin' })
  async getReferralVouchersList(
    @GetUser() user: any,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
  ) {
    return this.vouchersService.getReferralVouchersList(user, effectiveStoreId);
  }

  @Get('referral-rewards-config')
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.VOUCHERS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get referral reward tiers config' })
  async getReferralRewardConfig() {
    return this.vouchersService.getReferralRewardConfig();
  }

  @Get('referral-rewards-config/public')
  @Public()
  @ApiOperation({ summary: 'Get referral reward tiers config for portal' })
  async getReferralRewardConfigPublic() {
    return this.vouchersService.getReferralRewardConfig();
  }

  @Get('order-voucher/:orderCode')
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.VOUCHERS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get voucher info for a specific order' })
  async getOrderVoucher(
    @Param('orderCode') orderCode: string,
    @GetUser() user: any,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
  ) {
    return this.vouchersService.getOrderVoucher(orderCode, user, effectiveStoreId);
  }

  // --- :id routes MUST be last among GETs ---
  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get voucher by ID' })
  async findOne(@Param('id') id: string) {
    return this.vouchersService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.VOUCHERS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new voucher' })
  async create(
    @GetUser() user: any,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Body() data: any,
  ) {
    return this.vouchersService.create(data, user, effectiveStoreId);
  }

  @Post('send-otp')
  @Public()
  @ApiOperation({ summary: 'Send SMS OTP for QR claim' })
  async sendOtp(
    @Body() dto: { phone: string; orderCode: string }
  ) {
    return this.vouchersService.sendOtp(dto.phone, dto.orderCode);
  }

  @Post('claim-qr')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Claim a QR voucher' })
  async claimQRVoucher(
    @GetUser('id') userId: string,
    @Body() dto: ClaimQRVoucherDto,
  ) {
    return this.vouchersService.claimQRVoucher(
      userId,
      dto.orderCode,
      dto.phone,
      dto.voucherId,
      dto.otp,
    );
  }

  @Post('manual-verify')
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.VOUCHERS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger manual voucher verification' })
  async manualVerifyVouchers() {
    return this.vouchersService.manualTriggerVerification();
  }

  @Post('create-order-voucher')
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.VOUCHERS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a dedicated voucher for a specific order' })
  async createOrderVoucher(
    @GetUser() user: any,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Body() data: { 
      orderId: string; 
      name?: string;
      type?: 'FIXED_AMOUNT' | 'PERCENT' | 'FREESHIP' | 'STACK';
      value?: number; 
      maxDiscount?: number;
      minOrderValue?: number;
      durationDays?: number;
      perCustomerLimit?: number;
      stackTiers?: any;
    }
  ) {
    return this.vouchersService.createOrderVoucher(data, user, effectiveStoreId);
  }

  @Post('referral-voucher')
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.VOUCHERS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a referral voucher' })
  async createReferralVoucher(
    @GetUser() user: any,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Body() data: any,
  ) {
    return this.vouchersService.createReferralVoucher(data, user, effectiveStoreId);
  }

  @Post('referral-rewards-config')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save referral reward tiers config' })
  async saveReferralRewardConfig(@Body() data: { tiers: any[] }) {
    return this.vouchersService.saveReferralRewardConfig(data);
  }

  @Patch(':id')
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.VOUCHERS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a voucher' })
  async update(
    @GetUser() user: any,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.vouchersService.update(id, data, user, effectiveStoreId);
  }

  @Delete(':id')
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.VOUCHERS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a voucher' })
  async remove(
    @GetUser() user: any,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Param('id') id: string,
  ) {
    return this.vouchersService.remove(id, user, effectiveStoreId);
  }
}
