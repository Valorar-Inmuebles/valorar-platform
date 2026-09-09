import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ContactController } from './controllers/contact.controller';
import { ContactRepository } from './repositories/contact.repository';
import { ContactService } from './services/contact.service';

@Module({
  imports: [AuthModule],
  controllers: [ContactController],
  providers: [ContactService, ContactRepository],
  exports: [ContactService, ContactRepository],
})
export class ContactModule {}
