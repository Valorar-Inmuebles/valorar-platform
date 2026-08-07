import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * Houzez → Valorar migration infrastructure.
 * Write/import mode is intentionally not registered as a public runtime API.
 * Use CLI: `npm run migration:houzez -- audit|dry-run ...`
 */
@Module({
  imports: [PrismaModule],
  providers: [],
  exports: [],
})
export class MigrationHouzezModule {}
