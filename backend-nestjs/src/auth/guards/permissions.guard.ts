import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Permission } from '../enums/permissions.enum';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // 1. ADMIN bypasses everything
    if (user.role === 'ADMIN') {
      request.effectiveStoreId = null;
      return true;
    }

    // 2. MODERATOR (Store Owner)
    if (user.role === 'MODERATOR') {
      const ownedStoreId = user.store?.id;
      if (!ownedStoreId) {
        throw new ForbiddenException('Store owner has no assigned store');
      }
      request.effectiveStoreId = ownedStoreId;
      return true;
    }

    // 3. STAFF
    if (user.role === 'STAFF') {
      if (!user.staffStoreId) {
        throw new ForbiddenException('Chưa cấp quyền (Thiếu cửa hàng quản lý)');
      }
      request.effectiveStoreId = user.staffStoreId;

      // Check specific permissions if required
      if (requiredPermissions && requiredPermissions.length > 0) {
        const userPermissions = (user.staffPermissions as string[]) || [];
        const hasAllPermissions = requiredPermissions.every((permission) =>
          userPermissions.includes(permission),
        );

        if (!hasAllPermissions) {
          throw new ForbiddenException('Staff does not have required permissions');
        }
      }
      return true;
    }

    // Default: Deny access for other roles (like CUSTOMER) if permissions are required
    if (requiredPermissions && requiredPermissions.length > 0) {
      throw new ForbiddenException('Access denied for this role');
    }

    return true;
  }
}
