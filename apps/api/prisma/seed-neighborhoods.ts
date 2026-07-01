import type { PrismaClient } from '../generated/prisma/client';

/**
 * GEO-001 does not seed neighborhoods.
 * Reserved for future subdivisions (Palermo Soho, Lanús Este, etc.).
 */
export async function seedNeighborhoods(_prisma: PrismaClient): Promise<number> {
  return 0;
}
