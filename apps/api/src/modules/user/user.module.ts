import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserController } from './controllers/user.controller';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './services/user.service';
import { PasswordChangeController } from './password/password-change.controller';
import { PasswordChangeGuard } from './password/password-change.guard';
import { PasswordChangeRepository } from './password/password-change.repository';
import { PasswordChangeService } from './password/password-change.service';

@Module({
  imports: [AuthModule],
  controllers: [PasswordChangeController, UserController],
  providers: [
    UserService,
    UserRepository,
    PasswordChangeGuard,
    PasswordChangeRepository,
    PasswordChangeService,
  ],
  exports: [UserService, UserRepository],
})
export class UserModule {}
