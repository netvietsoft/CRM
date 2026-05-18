import { Controller, Get, Put, Post, Body, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { PancakeService } from '../integrations/pancake/pancake.service';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private usersService: UsersService,
    private pancakeService: PancakeService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@GetUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get detailed profile with OAuth accounts' })
  async getDetailedProfile(@GetUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(@GetUser('id') userId: string, @Body() data: any) {
    const result = await this.usersService.updateProfile(userId, data);
    
    // Auto sync pancake orders if phone is updated
    if (data.phone) {
      this.pancakeService.syncOrdersForUser(data.phone, userId).catch(err => {
        console.error('Error auto-syncing pancake orders after profile update:', err);
      });
    }
    
    return result;
  }

  @Put('password')
  @ApiOperation({ summary: 'Update user password' })
  async updatePassword(
    @GetUser('id') userId: string,
    @Body() data: { currentPassword: string; newPassword: string },
  ) {
    return this.usersService.updatePassword(
      userId,
      data.currentPassword,
      data.newPassword,
    );
  }

  @Post('onboarding')
  @ApiOperation({ summary: 'Complete user onboarding' })
  async completeOnboarding(@GetUser('id') userId: string, @Body() data: any) {
    const result = await this.usersService.completeOnboarding(userId, data);

    let pancakeSync: {
      success: boolean;
      totalSpent: number;
      phone: string | null;
      error?: string;
    } = {
      success: false,
      totalSpent: 0,
      phone: result.user.phone || null,
    };

    if (result.user.phone) {
      try {
        const totalSpent = await this.pancakeService.syncOrdersForUser(
          result.user.phone,
          userId,
        );
        pancakeSync = {
          success: true,
          totalSpent,
          phone: result.user.phone,
        };
      } catch (err) {
        console.error('Error syncing pancake orders after onboarding:', err);
        pancakeSync = {
          success: false,
          totalSpent: 0,
          phone: result.user.phone,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    }

    return {
      ...result,
      pancakeSync,
    };
  }

  @Post(':userId/sync-pancake-orders')
  @ApiOperation({ summary: 'Sync Pancake orders for a user by their phone number' })
  async syncPancakeOrders(@Param('userId') userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.phone) {
      return {
        success: false,
        message: 'User not found or has no phone number',
      };
    }

    const totalSpent = await this.pancakeService.syncOrdersForUser(
      user.phone,
      userId,
    );

    return {
      success: true,
      message: `Synced Pancake orders for user ${userId}`,
      totalSpent,
    };
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get user portal dashboard data' })
  async getPortalDashboard(@GetUser('id') userId: string) {
    return this.usersService.getPortalDashboard(userId);
  }

  @Get('portal-layout-meta')
  @ApiOperation({ summary: 'Get portal layout metadata' })
  async getPortalLayoutMeta(@GetUser('id') userId: string) {
    return this.usersService.getPortalLayoutMeta(userId);
  }
}
