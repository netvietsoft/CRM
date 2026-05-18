import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AssignStaffDto } from './dto/assign-staff.dto';
import { CreateStaffDto } from './dto/create-staff.dto';

@ApiTags('Admin/Staff')
@Controller('admin/staff')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class StaffController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Create a new staff member' })
  @ApiResponse({ status: 201, description: 'Staff created successfully' })
  async createStaff(
    @GetUser() user: any,
    @Body() dto: CreateStaffDto,
  ) {
    // If MODERATOR, force storeId to their own store
    if (user.role === 'MODERATOR') {
      const ownedStoreId = user.store?.id;
      dto.storeId = ownedStoreId; // FORCE OWN STORE
    }
    
    return this.adminService.createStaff(dto);
  }

  @Post('assign')
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Assign an existing user as staff' })
  async assignStaff(
    @GetUser() user: any,
    @Body() dto: AssignStaffDto,
  ) {
    // ... (existing logic)
    if (user.role === 'MODERATOR') {
      const ownedStoreId = user.store?.id;
      if (dto.storeId !== ownedStoreId) {
        throw new ForbiddenException('Moderator can only assign staff to their own store');
      }
    }
    return this.adminService.assignStaff(dto);
  }

  @Get('members')
  @Roles('ADMIN', 'MODERATOR', 'STAFF')
  @ApiOperation({ summary: 'Get all admin/moderator/staff members for order assignment' })
  async getStoreMembers(
    @GetUser() user: any,
    @Query('storeId') storeId?: string,
  ) {
    let effectiveStoreId = storeId;

    if (user.role === 'MODERATOR') {
      effectiveStoreId = user.store?.id;
    } else if (user.role === 'STAFF') {
      effectiveStoreId = user.staffStoreId;
    } else if (user.role === 'ADMIN') {
      // ADMIN: use query param, or own store/staffStoreId
      effectiveStoreId = storeId || user.store?.id || user.staffStoreId;
    }

    const members = await this.adminService.getStoreMembers(effectiveStoreId);
    return { staff: members };
  }

  @Get()
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Get all staff for a store' })
  async getStaff(
    @GetUser() user: any,
    @Query('storeId') storeId?: string,
  ) {
    let effectiveStoreId = storeId;

    if (user.role === 'MODERATOR') {
      effectiveStoreId = user.store?.id;
    } else if (user.role === 'ADMIN' && !storeId) {
       // Admin can see all staff if no storeId provided, or we can require it
    }

    return this.adminService.getStoreStaff(effectiveStoreId);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Remove staff from a store' })
  async removeStaff(
    @GetUser() user: any,
    @Param('id') staffId: string,
  ) {
    // If MODERATOR, verify the staff belongs to their store
    const storeId = user.role === 'MODERATOR' ? user.store?.id : undefined;
    return this.adminService.removeStaff(staffId, storeId);
  }
}
