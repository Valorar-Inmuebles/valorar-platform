import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RentalContractController } from './controllers/rental-contract.controller';
import { RentalContractRepository } from './repositories/rental-contract.repository';
import { RentalContractService } from './services/rental-contract.service';

@Module({
  imports: [AuthModule],
  controllers: [RentalContractController],
  providers: [RentalContractService, RentalContractRepository],
})
export class RentalContractModule {}
