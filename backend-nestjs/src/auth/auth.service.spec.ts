import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import * as bcrypt from 'bcryptjs';

describe('AuthService & JWT Strategy Token Split (TASK-006)', () => {
  let authService: AuthService;
  let jwtStrategy: JwtStrategy;
  let jwtRefreshStrategy: JwtRefreshStrategy;
  let prisma: any;
  let jwtService: any;
  let configService: any;

  beforeEach(() => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      refreshToken: {
        findMany: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      order: {
        updateMany: jest.fn(),
      },
      referralClosure: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    jwtService = {
      signAsync: jest.fn().mockImplementation(async (payload, options) => {
        return `jwt.${Buffer.from(JSON.stringify(payload)).toString('base64')}.${options?.secret || 'default_secret'}`;
      }),
    };

    configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'JWT_SECRET') return 'super_secret_access_key';
        if (key === 'JWT_REFRESH_SECRET') return 'super_secret_refresh_key';
        if (key === 'JWT_ACCESS_EXPIRY') return '15m';
        if (key === 'JWT_REFRESH_EXPIRY') return '30d';
        return defaultValue;
      }),
    };

    authService = new AuthService(
      prisma,
      jwtService,
      configService,
      {} as any,
      {
        grantReferralReward: jest.fn(),
        grantWelcomeVouchers: jest.fn(),
      } as any,
      {
        createNotification: jest.fn(),
      } as any,
      {
        handleCustomerCreated: jest.fn(),
      } as any,
    );

    jwtStrategy = new JwtStrategy(configService, prisma);
    jwtRefreshStrategy = new JwtRefreshStrategy(configService);
  });

  describe('Token Generation Split', () => {
    it('sinh Access Token và Refresh Token với 2 secret và payload type khác nhau', async () => {
      const tokens = await (authService as any).generateTokens('user-1', 'CUSTOMER');

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();

      // Access Token được ký với access secret và type: 'access'
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { userId: 'user-1', role: 'CUSTOMER', type: 'access' },
        { secret: 'super_secret_access_key', expiresIn: '15m' },
      );

      // Refresh Token được ký với refresh secret và type: 'refresh'
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { userId: 'user-1', type: 'refresh' },
        { secret: 'super_secret_refresh_key', expiresIn: '30d' },
      );
    });
  });

  describe('JwtStrategy (Access Token Validator)', () => {
    it('từ chối 401 Unauthorized nếu token truyền vào có type === "refresh"', async () => {
      await expect(
        jwtStrategy.validate({ userId: 'user-1', role: 'CUSTOMER', type: 'refresh' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid token type'));

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('chấp nhận và trả về user nếu token có type === "access" và user active', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Nguyen Van A',
        email: 'a@example.com',
        phone: '0901234567',
        role: 'CUSTOMER',
        isActive: true,
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await jwtStrategy.validate({
        userId: 'user-1',
        role: 'CUSTOMER',
        type: 'access',
      });

      expect(result).toEqual(mockUser);
    });

    it('từ chối nếu tài khoản người dùng bị vô hiệu hóa (isActive = false)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        isActive: false,
      });

      await expect(
        jwtStrategy.validate({ userId: 'user-1', role: 'CUSTOMER', type: 'access' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('JwtRefreshStrategy (Refresh Token Validator)', () => {
    it('từ chối nếu token truyền vào là access token (type === "access")', () => {
      const req: any = { cookies: { crm_refresh_token: 'valid_refresh_token' } };

      expect(() =>
        jwtRefreshStrategy.validate(req, { userId: 'user-1', type: 'access' }),
      ).toThrow(new UnauthorizedException('Invalid token type'));
    });

    it('chấp nhận nếu token là refresh token (type === "refresh")', () => {
      const req: any = { cookies: { crm_refresh_token: 'valid_refresh_token' } };

      const result = jwtRefreshStrategy.validate(req, { userId: 'user-1', type: 'refresh' });

      expect(result).toEqual({
        userId: 'user-1',
        type: 'refresh',
        refreshToken: 'valid_refresh_token',
      });
    });
  });

  describe('Refresh Token Flow (authService.refreshTokens)', () => {
    it('cấp phát cặp token mới thành công khi refresh token khớp trong DB', async () => {
      const hashed = await bcrypt.hash('my_raw_refresh_token', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: 'CUSTOMER',
      });
      prisma.refreshToken.findMany.mockResolvedValue([
        { id: 'rt-1', token: hashed, expiresAt: new Date(Date.now() + 100000) },
      ]);
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-2' });

      const result = await authService.refreshTokens('user-1', 'my_raw_refresh_token');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it('từ chối 401 Unauthorized khi refresh token không khớp với DB', async () => {
      const hashedOther = await bcrypt.hash('other_token', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: 'CUSTOMER',
      });
      prisma.refreshToken.findMany.mockResolvedValue([
        { id: 'rt-1', token: hashedOther, expiresAt: new Date(Date.now() + 100000) },
      ]);

      await expect(
        authService.refreshTokens('user-1', 'invalid_refresh_token'),
      ).rejects.toThrow(new UnauthorizedException('Invalid refresh token'));
    });
  });
});
