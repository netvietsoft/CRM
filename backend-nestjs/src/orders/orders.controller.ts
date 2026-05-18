import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { GetEffectiveStoreId } from '../auth/decorators/get-effective-store-id.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permissions.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateAdminOrderDto } from './dto/create-admin-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CheckStockDto } from './dto/check-stock.dto';
import { ShippingFeeDto } from './dto/shipping-fee.dto';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  create(@GetUser('id') userId: string, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(userId, createOrderDto);
  }

  @Post('admin')
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.ORDERS_MANAGE)
  @ApiOperation({ summary: 'Create order from admin' })
  createAdminOrder(
    @GetUser('id') userId: string,
    @GetUser('role') role: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Body() createOrderDto: CreateAdminOrderDto,
  ) {
    return this.ordersService.createAdminOrder({
      actorId: userId,
      actorRole: role,
      effectiveStoreId,
      createOrderDto,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get user orders' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  findAll(@GetUser('id') userId: string) {
    return this.ordersService.findAll(userId);
  }

  @Get('admin')
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.ORDERS_VIEW)
  @ApiOperation({ summary: 'Get all orders for admin/staff' })
  async findAdminOrders(
    @GetUser('id') userId: string,
    @GetUser('role') role: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Query('page') page?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('dateField') dateField?: string,
    @Query('dateSort') dateSort?: string,
    @Query('dateFilterType') dateFilterType?: string,
    @Query('dateValue') dateValue?: string,
  ) {
    return this.ordersService.findAdminOrders({
      userId,
      role,
      effectiveStoreId,
      page: page ? Number(page) : undefined,
      status,
      search,
      paymentMethod,
      dateField,
      dateSort,
      dateFilterType,
      dateValue,
    });
  }

  @Get(':id')
  @UseGuards(RolesGuard, PermissionsGuard)
  @ApiOperation({ summary: 'Get order detail' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  async findOne(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @GetUser('role') role: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
  ) {
    return this.ordersService.findOne(id, userId, role, effectiveStoreId);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.ORDERS_MANAGE)
  @ApiOperation({ summary: 'Update order status' })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  updateStatus(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @GetUser('role') role: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Body() updateDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, updateDto, userId, role, effectiveStoreId);
  }

  @Patch(':id/read')
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.ORDERS_VIEW)
  @ApiOperation({ summary: 'Mark order as read' })
  @ApiResponse({ status: 200, description: 'Order marked as read' })
  markAsRead(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @GetUser('role') role: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
  ) {
    return this.ordersService.markAsRead(id, userId, role, effectiveStoreId);
  }

  @Post('check-stock')
  @ApiOperation({ summary: 'Check product stock before checkout' })
  @ApiResponse({ status: 200, description: 'Stock checked successfully' })
  checkStock(@Body() checkStockDto: CheckStockDto) {
    return this.ordersService.checkStock(
      checkStockDto.productId,
      checkStockDto.size,
      checkStockDto.color,
      checkStockDto.quantity,
    );
  }

  @Post('shipping-fee')
  @ApiOperation({ summary: 'Calculate shipping fee' })
  @ApiResponse({ status: 200, description: 'Shipping fee calculated' })
  calculateShippingFee(@Body() shippingFeeDto: ShippingFeeDto) {
    return this.ordersService.calculateShippingFee(
      shippingFeeDto.street,
      shippingFeeDto.ward,
      shippingFeeDto.province,
      shippingFeeDto.totalWeight,
      shippingFeeDto.storeId,
    );
  }

  @Get('check-purchase/:productId')
  @ApiOperation({ summary: 'Check if user has purchased a product' })
  checkProductPurchase(
    @GetUser('id') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.ordersService.checkProductPurchase(userId, productId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Customer cancels their own order (only PENDING/CONFIRMED)' })
  @ApiResponse({ status: 200, description: 'Order cancelled by customer' })
  cancelOrder(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @Body() body: { reason?: string },
  ) {
    return this.ordersService.customerCancelOrder(id, userId, body?.reason);
  }

  @Patch(':id/confirm-received')
  @ApiOperation({ summary: 'Customer confirms order received' })
  @ApiResponse({ status: 200, description: 'Order marked as completed by customer' })
  confirmReceived(
    @Param('id') id: string,
    @GetUser('id') userId: string,
  ) {
    return this.ordersService.customerConfirmReceived(id, userId);
  }

  @Get('public/qr-summary/:orderCode')
  @Public()
  @ApiOperation({ summary: 'Get basic order info for QR claim by order code' })
  async getQrSummary(@Param('orderCode') orderCode: string) {
    return this.ordersService.getQrSummary(orderCode);
  }

  @Get('public/track')
  @Public()
  @ApiOperation({ summary: 'Publicly track order by code and phone' })
  trackPublicOrder(
    @Query('code') code: string,
    @Query('phone') phone: string,
  ) {
    return this.ordersService.trackPublicOrder(code, phone);
  }
  @Get(':id/payment-status')
  @ApiOperation({ summary: 'Poll payment status for VietQR' })
  async getPaymentStatus(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @GetUser('role') role: string,
  ) {
    const order = await this.ordersService.findOne(id, userId, role);
    const isExpired = this.ordersService.isPaymentExpired(order);

    return {
      status: order.paymentStatus === 'PAID' ? 'SUCCESS' : 'PENDING',
      is_expired: isExpired,
    };
  }

  @Delete(':id')
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Hard delete order (Admin/Owner only)' })
  @ApiResponse({ status: 200, description: 'Order deleted permanently' })
  hardDelete(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @GetUser('role') role: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
  ) {
    return this.ordersService.hardDelete(id, userId, role, effectiveStoreId);
  }

  @Patch(':id/note')
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.ORDERS_MANAGE)
  @ApiOperation({ summary: 'Update order notes' })
  @ApiResponse({ status: 200, description: 'Order notes updated' })
  updateNote(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @GetUser('role') role: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Body() body: { note?: string; customerNote?: string },
  ) {
    return this.ordersService.updateNote(id, body, userId, role, effectiveStoreId);
  }

  @Patch(':id/assign-staff')
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.ORDERS_MANAGE)
  @ApiOperation({ summary: 'Update staff assignment on order' })
  @ApiResponse({ status: 200, description: 'Staff assignment updated' })
  updateStaffAssignment(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @GetUser('role') role: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Body() body: { assigningSellerId?: string; assigningCareId?: string },
  ) {
    return this.ordersService.updateStaffAssignment(id, body, userId, role, effectiveStoreId);
  }

  @Patch(':id/admin-update')
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'STAFF', 'MODERATOR')
  @Permissions(Permission.ORDERS_MANAGE)
  @ApiOperation({ summary: 'Update admin-managed fields on order' })
  @ApiResponse({ status: 200, description: 'Order updated' })
  updateAdminFields(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @GetUser('role') role: string,
    @GetEffectiveStoreId() effectiveStoreId: string | null,
    @Body() body: any,
  ) {
    return this.ordersService.updateAdminFields(id, body, userId, role, effectiveStoreId);
  }
}
