import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy, ExtractJwt } from 'passport-jwt';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import {
  ACCESS_TOKEN_COOKIE,
  getJwtSecret,
  JWT_AUDIENCE,
  JWT_ISSUER,
} from '../constants/auth.constants';
import { AuthService } from '../auth.service';

type JwtPayload = {
  sub: string;
  email: string;
  role: AuthenticatedUser['role'];
  tenantId: string | null;
};

function extractAccessTokenFromCookie(request: Request): string | null {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const token = cookies?.[ACCESS_TOKEN_COOKIE];
  return typeof token === 'string' && token.length > 0 ? token : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractAccessTokenFromCookie]),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    return this.authService.getAuthenticatedUser(payload.sub);
  }
}
