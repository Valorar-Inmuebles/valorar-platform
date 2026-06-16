import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '../../../generated/prisma/client';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import {
  INACTIVE_USER_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
} from './constants/auth.constants';
import { LoginDto } from './dto/login.dto';
import { AuthRepository } from './repositories/auth.repository';
import { verifyPassword } from './utils/password.util';

type JwtPayload = {
  sub: string;
  email: string;
  role: AuthenticatedUser['role'];
  tenantId: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    dto: LoginDto,
  ): Promise<{ user: AuthenticatedUser; token: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.authRepository.findUserByEmail(normalizedEmail);

    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    await this.assertUserCanAuthenticate(user);

    const passwordValid = await verifyPassword(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    await this.authRepository.updateLastLoginAt(user.id);

    const authenticatedUser = this.toAuthenticatedUser(user);
    const token = this.signToken(authenticatedUser);

    return { user: authenticatedUser, token };
  }

  async getAuthenticatedUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.authRepository.findUserById(userId);

    if (!user) {
      throw new UnauthorizedException();
    }

    await this.assertUserCanAuthenticate(user);

    return this.toAuthenticatedUser(user);
  }

  signToken(user: AuthenticatedUser): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    return this.jwtService.sign(payload);
  }

  toAuthenticatedUser(user: User): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    };
  }

  private async assertUserCanAuthenticate(user: User): Promise<void> {
    if (!user.isActive) {
      throw new UnauthorizedException(INACTIVE_USER_MESSAGE);
    }

    if (user.tenantId) {
      const tenant = await this.authRepository.tenantExists(user.tenantId);
      if (!tenant) {
        throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
      }
    }
  }
}
