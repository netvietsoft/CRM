import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private configService: ConfigService) {
    const accessSecret = configService.get<string>('JWT_SECRET');
    const refreshSecret =
      configService.get<string>('JWT_REFRESH_SECRET') || `${accessSecret}_refresh`;

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ((request: Request) => {
          return request?.cookies?.['crm_refresh_token'];
        }) as any,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: refreshSecret,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: { userId: string; type?: string }) {
    if (payload.type && payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const refreshToken =
      req.cookies?.['crm_refresh_token'] ||
      ExtractJwt.fromAuthHeaderAsBearerToken()(req as any);

    return { ...payload, refreshToken };
  }
}
