import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Permission } from '../enums/permissions.enum';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly messagingPermissionAliases: Record<Permission, Permission[]> = {
    [Permission.MESSAGING_VIEW]: [
      Permission.MESSAGING_VIEW,
      Permission.MESSAGING_COMPOSE,
      Permission.MESSAGING_SEND,
      Permission.MESSAGING_SCHEDULE,
      Permission.MESSAGING_RULE_MANAGE,
      Permission.MESSAGING_LOG_VIEW,
      Permission.MESSAGING_MANAGE,
    ],
    [Permission.MESSAGING_COMPOSE]: [Permission.MESSAGING_COMPOSE, Permission.MESSAGING_MANAGE],
    [Permission.MESSAGING_SEND]: [Permission.MESSAGING_SEND, Permission.MESSAGING_MANAGE],
    [Permission.MESSAGING_SCHEDULE]: [Permission.MESSAGING_SCHEDULE, Permission.MESSAGING_MANAGE],
    [Permission.MESSAGING_RULE_MANAGE]: [
      Permission.MESSAGING_RULE_MANAGE,
      Permission.MESSAGING_MANAGE,
    ],
    [Permission.MESSAGING_LOG_VIEW]: [
      Permission.MESSAGING_LOG_VIEW,
      Permission.MESSAGING_VIEW,
      Permission.MESSAGING_MANAGE,
    ],
    [Permission.MESSAGING_MANAGE]: [Permission.MESSAGING_MANAGE],
    // Xem đơn: quyền "chỉ đơn của mình" cũng qua cửa — service sẽ tự lọc theo NV.
    [Permission.ORDERS_VIEW]: [Permission.ORDERS_VIEW, Permission.ORDERS_VIEW_OWN],
    [Permission.ORDERS_VIEW_OWN]: [Permission.ORDERS_VIEW_OWN, Permission.ORDERS_VIEW],
    [Permission.ORDERS_MANAGE]: [Permission.ORDERS_MANAGE],
    [Permission.ORDERS_DELETE]: [Permission.ORDERS_DELETE],
    [Permission.PRODUCTS_VIEW]: [Permission.PRODUCTS_VIEW],
    [Permission.PRODUCTS_MANAGE]: [Permission.PRODUCTS_MANAGE],
    [Permission.PRODUCTS_DELETE]: [Permission.PRODUCTS_DELETE],
    [Permission.CATEGORIES_VIEW]: [Permission.CATEGORIES_VIEW],
    [Permission.CATEGORIES_MANAGE]: [Permission.CATEGORIES_MANAGE],
    [Permission.CATEGORIES_DELETE]: [Permission.CATEGORIES_DELETE],
    [Permission.VOUCHERS_VIEW]: [Permission.VOUCHERS_VIEW],
    [Permission.VOUCHERS_MANAGE]: [Permission.VOUCHERS_MANAGE],
    [Permission.VOUCHERS_DELETE]: [Permission.VOUCHERS_DELETE],
    [Permission.CUSTOMERS_VIEW]: [Permission.CUSTOMERS_VIEW],
    [Permission.CUSTOMERS_MANAGE]: [Permission.CUSTOMERS_MANAGE],
    [Permission.CUSTOMERS_DELETE]: [Permission.CUSTOMERS_DELETE],
    [Permission.STORE_SETTINGS]: [Permission.STORE_SETTINGS],
    [Permission.INTEGRATIONS_VIEW]: [Permission.INTEGRATIONS_VIEW],
    [Permission.INTEGRATIONS_MANAGE]: [Permission.INTEGRATIONS_MANAGE],
    [Permission.STAFF_MANAGE]: [Permission.STAFF_MANAGE],
    // Messenger inbox: SEND bao hàm VIEW.
    [Permission.MESSENGER_VIEW]: [Permission.MESSENGER_VIEW, Permission.MESSENGER_SEND],
    [Permission.MESSENGER_SEND]: [Permission.MESSENGER_SEND],
  };

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    if (user.role === 'ADMIN') {
      request.effectiveStoreId = null;
      return true;
    }

    if (user.role === 'MODERATOR') {
      const ownedStoreId = user.store?.id;
      if (!ownedStoreId) {
        throw new ForbiddenException('Store owner has no assigned store');
      }
      request.effectiveStoreId = ownedStoreId;
      return true;
    }

    if (user.role === 'STAFF') {
      if (!user.staffStoreId) {
        throw new ForbiddenException('Chưa cấp quyền (Thiếu cửa hàng quản lý)');
      }
      request.effectiveStoreId = user.staffStoreId;

      if (requiredPermissions && requiredPermissions.length > 0) {
        const userPermissions = (user.staffPermissions as string[]) || [];
        const hasAllPermissions = requiredPermissions.every((permission) =>
          this.resolvePermissionAliases(permission).some((candidate) =>
            userPermissions.includes(candidate),
          ),
        );

        if (!hasAllPermissions) {
          throw new ForbiddenException('Staff does not have required permissions');
        }
      }
      return true;
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      throw new ForbiddenException('Access denied for this role');
    }

    return true;
  }

  private resolvePermissionAliases(permission: Permission): Permission[] {
    return this.messagingPermissionAliases[permission] || [permission];
  }
}
