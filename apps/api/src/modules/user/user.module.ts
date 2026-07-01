import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserController } from './controllers/user.controller';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './services/user.service';

@Module({
  imports: [AuthModule],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService, UserRepository],
})
export class UserModule {}
