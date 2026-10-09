const query = jest.fn();
const poolConstructor = jest.fn();
jest.mock('pg', () => ({
  Pool: class {
    query = query;
    end = jest.fn();
    constructor(options: unknown) {
      poolConstructor(options);
    }
  },
}));
jest.mock('@prisma/adapter-pg', () => ({ PrismaPg: class {} }));
jest.mock('../../generated/prisma/client', () => ({
  PrismaClient: class {
    $connect = jest.fn();
    $disconnect = jest.fn();
  },
}));
import { PrismaService } from './prisma.service';
import {
  REALDATA_HOST,
  REALDATA_ENDPOINT,
  REALDATA_IDENTITY_SQL,
} from '../common/safety/realdata-safety';

describe('RealData Prisma startup gate (mocked transport)', () => {
  const previous = process.env;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...previous,
      VALORAR_DATABASE_ENV: 'realdata',
      DATABASE_URL: `postgresql://fake:fake@${REALDATA_HOST}/neondb?sslmode=require`,
      REALDATA_NEON_PROJECT_ID: 'test-project-123',
      REALDATA_NEON_BRANCH_ID: 'br-test-realdata',
      JWT_SECRET: 'test-only-local-secret-with-more-than-32-characters',
    };
  });
  afterEach(() => {
    process.env = previous;
  });
  it('forces read-only in the actual Pool and verifies remote identity before Prisma starts', async () => {
    query.mockResolvedValue({
      rows: [
        {
          project: 'test-project-123',
          branch: 'br-test-realdata',
          endpoint: REALDATA_ENDPOINT,
          database: 'neondb',
          readonly: 'on',
        },
      ],
    });
    const prisma = new PrismaService();
    expect(poolConstructor).toHaveBeenCalledWith({
      connectionString: expect.stringContaining(
        'default_transaction_read_only%3Don',
      ) as string,
    });
    await prisma.onModuleInit();
    expect(query).toHaveBeenCalledWith(REALDATA_IDENTITY_SQL);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(prisma.$connect).toHaveBeenCalledTimes(1);
  });
  it('aborts startup on a production branch identity', async () => {
    query.mockResolvedValue({
      rows: [
        {
          project: 'test-project-123',
          branch: 'br-rapid-bread-acsu0836',
          endpoint: REALDATA_ENDPOINT,
          database: 'neondb',
          readonly: 'on',
        },
      ],
    });
    const prisma = new PrismaService();
    await expect(prisma.onModuleInit()).rejects.toThrow('identidad');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(prisma.$connect).not.toHaveBeenCalled();
  });
});
