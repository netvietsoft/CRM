import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AdminNotificationsService } from '../modules/admin-notifications/admin-notifications.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
    private vouchersService: VouchersService,
    private adminNotificationsService: AdminNotificationsService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { phone, email, password, name, referralCode } = registerDto;

    // Check if user exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: phone || undefined },
          { email: email || undefined },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('Số điện thoại hoặc email đã được sử dụng');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate unique referral code
    const userReferralCode = await this.generateUniqueReferralCode();

    // Find referrer if referral code provided
    let referrerId: string | null = null;
    if (referralCode) {
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode },
      });
      if (referrer) {
        referrerId = referrer.id;
      }
    }

    // Create user
    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        referralCode: userReferralCode,
        referrerId,
        role: 'CUSTOMER',
      },
    });

    // Prepare display name for notifications
    const displayName = name || phone || email || 'Khách hàng';

    // Auto-link guest orders with matching phone number
    if (phone) {
      const linkedCount = await this.prisma.order.updateMany({
        where: {
          userId: null, // Guest orders only
          shippingPhone: phone,
        },
        data: {
          userId: user.id,
        },
      });

      if (linkedCount.count > 0) {
        // Log the auto-link for admin visibility
        await this.adminNotificationsService.createNotification({
          type: 'ORDER',
          title: 'Đơn hàng khách vãng lai đã được liên kết',
          message: `${linkedCount.count} đơn hàng của ${displayName} (${phone}) đã được tự động liên kết với tài khoản mới`,
          link: `/admin/customers/${user.id}`,
          metadata: { userId: user.id, linkedOrdersCount: linkedCount.count },
        });
      }
    }

    // Notify admins about new customer
    await this.adminNotificationsService.createNotification({
      type: 'CUSTOMER',
      title: 'Khách hàng mới đăng ký',
      message: `${displayName} (${phone || email || 'N/A'}) vừa tạo tài khoản`,
      link: `/admin/customers?search=${phone || email || ''}`,
      metadata: { userId: user.id, name: displayName, phone, email },
    });

    // Create referral closure entries
    if (referrerId) {
      await this.createReferralClosureEntries(user.id, referrerId);
      // Grant referral reward to referrer
      await this.vouchersService.grantReferralReward(referrerId);
    }

    // Grant welcome vouchers
    await this.vouchersService.grantWelcomeVouchers(user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.role);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      success: true,
      message: 'Đăng ký thành công',
      redirect: '/onboarding', // Always redirect to onboarding for new customer
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const { phone, password } = loginDto;

    // Support login by email or phone
    const isEmail = phone.includes('@');
    const user = await this.prisma.user.findFirst({
      where: isEmail ? { email: phone } : { phone },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Số điện thoại / email hoặc mật khẩu không chính xác');
    }

    // Check if account is active
    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Số điện thoại / email hoặc mật khẩu không chính xác');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.role);

    // Store refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    // Determine redirect
    const needsOnboarding = user.role === 'CUSTOMER' && !user.onboardingComplete;
    const redirect = ['ADMIN', 'STAFF', 'MODERATOR'].includes(user.role)
      ? '/admin'
      : needsOnboarding
      ? '/onboarding'
      : '/portal/products';

    return {
      success: true,
      redirect,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Access Denied');
    }

    // Verify refresh token exists in DB
    const storedTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        expiresAt: { gte: new Date() },
      },
    });

    let tokenValid = false;
    for (const storedToken of storedTokens) {
      const isMatch = await bcrypt.compare(refreshToken, storedToken.token);
      if (isMatch) {
        tokenValid = true;
        break;
      }
    }

    if (!tokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new tokens
    const tokens = await this.generateTokens(user.id, user.role);

    // Store new refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    // Delete all refresh tokens for this user
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return { success: true, message: 'Đăng xuất thành công' };
  }

  async googleLogin(profile: any, referralCode?: string) {
    const { id: googleId, emails, displayName, photos } = profile;
    const email = emails?.[0]?.value;

    if (!email) {
      throw new BadRequestException('Email not provided by Google');
    }

    // Check if user exists with this email
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create new user
      const userReferralCode = await this.generateUniqueReferralCode();
      
      let referrerId: string | null = null;
      if (referralCode) {
        const referrer = await this.prisma.user.findUnique({
          where: { referralCode },
        });
        if (referrer) {
          referrerId = referrer.id;
        }
      }

      user = await this.prisma.user.create({
        data: {
          email,
          name: displayName || 'User',
          referralCode: userReferralCode,
          referrerId,
          role: 'CUSTOMER',
          avatarUrl: photos?.[0]?.value,
        },
      });

      // Notify admins about new customer
      await this.adminNotificationsService.createNotification({
        type: 'CUSTOMER',
        title: 'Khách hàng mới đăng ký (Google)',
        message: `${displayName || 'User'} (${email}) vừa tạo tài khoản qua Google`,
        link: `/admin/customers?search=${email}`,
        metadata: { userId: user.id, name: displayName, email },
      });

      if (referrerId) {
        await this.createReferralClosureEntries(user.id, referrerId);
        // Grant referral reward to referrer
        await this.vouchersService.grantReferralReward(referrerId);
      }

      // Grant welcome vouchers
      await this.vouchersService.grantWelcomeVouchers(user.id);
    }

    // Create or update OAuth account
    await this.prisma.oAuthAccount.upsert({
      where: {
        provider_providerUserId: {
          provider: 'google',
          providerUserId: googleId,
        },
      },
      create: {
        provider: 'google',
        providerUserId: googleId,
        userId: user.id,
        profile: profile._json,
      },
      update: {
        profile: profile._json,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.role);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user,
      ...tokens,
    };
  }

  private async generateTokens(userId: string, role: string) {
    const payload = { userId, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRY', '15m'),
      }),
      this.jwtService.signAsync(
        { userId },
        {
          expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRY', '30d'),
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async storeRefreshToken(userId: string, refreshToken: string) {
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await this.prisma.refreshToken.create({
      data: {
        token: hashedToken,
        userId,
        expiresAt,
      },
    });
  }

  private async generateUniqueReferralCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    let isUnique = false;

    while (!isUnique) {
      code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const existing = await this.prisma.user.findUnique({
        where: { referralCode: code },
      });

      if (!existing) {
        isUnique = true;
        return code;
      }
    }
  }

  private async createReferralClosureEntries(userId: string, referrerId: string) {
    // Self-reference (depth 0) for the new user
    await this.prisma.referralClosure.create({
      data: {
        ancestorId: userId,
        descendantId: userId,
        depth: 0,
      },
    });

    // Ensure the referrer also has a self-reference entry (may be missing for legacy users)
    const referrerSelf = await this.prisma.referralClosure.findFirst({
      where: { ancestorId: referrerId, descendantId: referrerId, depth: 0 },
    });
    if (!referrerSelf) {
      await this.prisma.referralClosure.create({
        data: {
          ancestorId: referrerId,
          descendantId: referrerId,
          depth: 0,
        },
      });
    }

    // Get all ancestors of the referrer
    const referrerAncestors = await this.prisma.referralClosure.findMany({
      where: { descendantId: referrerId },
    });

    // Create closure entries for all ancestors
    for (const ancestor of referrerAncestors) {
      await this.prisma.referralClosure.create({
        data: {
          ancestorId: ancestor.ancestorId,
          descendantId: userId,
          depth: ancestor.depth + 1,
        },
      });
    }
  }
}
