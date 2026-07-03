import { Module } from '@nestjs/common';
import { PublicDevelopmentController } from './controllers/public-development.controller';
import { PublicDevelopmentRepository } from './repositories/public-development.repository';
import { PublicDevelopmentService } from './services/public-development.service';

@Module({
  controllers: [PublicDevelopmentController],
  providers: [PublicDevelopmentService, PublicDevelopmentRepository],
  exports: [PublicDevelopmentService, PublicDevelopmentRepository],
})
export class PublicDevelopmentModule {}
