import { Module } from '@nestjs/common';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import {
  getJwtExpiresIn,
  getJwtSecret,
  JWT_AUDIENCE,
  JWT_ISSUER,
} from './constants/auth.constants';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { TenantGuard } from './guards/tenant.guard';
import { AuthRepository } from './repositories/auth.repository';
import { JwtStrategy } from './strategies/jwt.strategy';

const jwtSignOptions: JwtSignOptions = {
  expiresIn: getJwtExpiresIn() as JwtSignOptions['expiresIn'],
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
};

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: jwtSignOptions,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    TenantGuard,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    TenantGuard,
    JwtModule,
    PassportModule,
  ],
})
export class AuthModule {}
