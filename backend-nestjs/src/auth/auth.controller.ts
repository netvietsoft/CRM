import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { Public } from './decorators/public.decorator';

import { PancakeService } from '../integrations/pancake/pancake.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private pancakeService: PancakeService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.register(registerDto);

    // Set cookies
    response.cookie('crm_access_token', result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: process.env.COOKIE_DOMAIN, // prod: .lestgoai.com → cookie dùng chung mọi subdomain; local undefined = host-only
      maxAge: 45 * 60 * 1000, // 45 minutes
    });

    response.cookie('crm_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: process.env.COOKIE_DOMAIN, // prod: .lestgoai.com → cookie dùng chung mọi subdomain; local undefined = host-only
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Auto sync pancake orders if phone is provided
    if (result.user.phone) {
      this.pancakeService.syncOrdersForUser(result.user.phone, result.user.id).catch((err) => {
        console.error('Error auto-syncing pancake orders after registration:', err);
      });
    }

    return {
      success: result.success,
      message: result.message,
      redirect: result.redirect,
      user: result.user,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(loginDto);

    // Set cookies
    response.cookie('crm_access_token', result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: process.env.COOKIE_DOMAIN, // prod: .lestgoai.com → cookie dùng chung mọi subdomain; local undefined = host-only
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    response.cookie('crm_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: process.env.COOKIE_DOMAIN, // prod: .lestgoai.com → cookie dùng chung mọi subdomain; local undefined = host-only
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return {
      success: result.success,
      redirect: result.redirect,
      user: result.user,
    };
  }

  @Post('send-login-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi OTP đăng nhập theo SĐT' })
  async sendLoginOtp(@Body() body: { phone: string }) {
    return this.authService.sendLoginOtpProxy(body.phone);
  }

  @Post('otp-login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập bằng SĐT + OTP' })
  async otpLogin(
    @Body() body: { phone: string; otp: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.loginWithPhoneOtp(body.phone, body.otp);
    response.cookie('crm_access_token', result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: process.env.COOKIE_DOMAIN,
      maxAge: 15 * 60 * 1000,
    });
    response.cookie('crm_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: process.env.COOKIE_DOMAIN,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { success: result.success, redirect: result.redirect, user: result.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @GetUser('userId') userId: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies['crm_refresh_token'];
    const tokens = await this.authService.refreshTokens(userId, refreshToken);

    // Set new cookies
    response.cookie('crm_access_token', tokens.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: process.env.COOKIE_DOMAIN, // prod: .lestgoai.com → cookie dùng chung mọi subdomain; local undefined = host-only
      maxAge: 15 * 60 * 1000,
    });

    response.cookie('crm_refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: process.env.COOKIE_DOMAIN, // prod: .lestgoai.com → cookie dùng chung mọi subdomain; local undefined = host-only
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return { success: true };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout user' })
  async logout(@GetUser('userId') userId: string, @Res({ passthrough: true }) response: Response) {
    await this.authService.logout(userId);

    // Clear cookies — phải khớp domain/flags đã set thì mới xoá đúng cookie
    const clearOpts = { domain: process.env.COOKIE_DOMAIN, httpOnly: true, secure: true, sameSite: 'none' as const };
    response.clearCookie('crm_access_token', clearOpts);
    response.clearCookie('crm_refresh_token', clearOpts);

    return { success: true, message: 'Đăng xuất thành công' };
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth login' })
  async googleAuth() {
    // Guard redirects to Google with state parameter
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthCallback(@Req() req: any, @Res() response: Response) {
    const result = await this.authService.googleLogin(req.user);

    // Set cookies
    response.cookie('crm_access_token', result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: process.env.COOKIE_DOMAIN, // prod: .lestgoai.com → cookie dùng chung mọi subdomain; local undefined = host-only
      maxAge: 15 * 60 * 1000,
    });

    response.cookie('crm_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: process.env.COOKIE_DOMAIN, // prod: .lestgoai.com → cookie dùng chung mọi subdomain; local undefined = host-only
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    // Redirect to frontend with returnTo from state
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const returnTo = req.user.returnTo || '/portal/products';
    const needsOnboarding = result.user.role === 'CUSTOMER' && !result.user.onboardingComplete;

    let redirect = returnTo;
    if (['ADMIN', 'STAFF', 'MODERATOR'].includes(result.user.role)) {
      redirect = '/admin';
    } else if (needsOnboarding) {
      // Preserve the original returnTo through onboarding so campaign params survive
      redirect = `/onboarding?returnTo=${encodeURIComponent(returnTo)}`;
    }

    response.redirect(`${frontendUrl}${redirect}`);
  }
}
