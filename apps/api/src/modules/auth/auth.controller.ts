import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { AuthService } from './auth.service';
import {
  AuthUserResponseDto,
  toAuthUserResponseDto,
} from './dto/auth-user-response.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  clearAccessTokenCookie,
  setAccessTokenCookie,
} from './utils/cookie.util';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Authenticated user profile',
    type: AuthUserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or inactive user',
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthUserResponseDto> {
    const { user, token } = await this.authService.login(dto);
    setAccessTokenCookie(response, token);
    return toAuthUserResponseDto(user);
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Clear authentication cookie' })
  @ApiNoContentResponse({ description: 'Logged out successfully' })
  logout(@Res({ passthrough: true }) response: Response): void {
    clearAccessTokenCookie(response);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiOkResponse({
    description: 'Authenticated user profile',
    type: AuthUserResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  me(@Req() request: AuthenticatedRequest): AuthUserResponseDto {
    return toAuthUserResponseDto(request.user);
  }
}
