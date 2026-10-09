jest.mock('../../../generated/prisma/client', () =>
  jest.requireActual<typeof import('../../../generated/prisma/enums')>(
    '../../../generated/prisma/enums',
  ),
);
jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('./utils/password.util', () => ({ verifyPassword: jest.fn() }));
import { AuthService } from './auth.service';
import { verifyPassword } from './utils/password.util';

describe('RealData login remains authenticated and does not mutate users', () => {
  const previous = process.env.VALORAR_DATABASE_ENV;
  afterEach(() => {
    if (previous === undefined) delete process.env.VALORAR_DATABASE_ENV;
    else process.env.VALORAR_DATABASE_ENV = previous;
    jest.clearAllMocks();
  });
  const setup = () => {
    const user = {
      id: 'u',
      email: 'test@example.test',
      role: 'TENANT_ADMIN',
      tenantId: 't',
      isActive: true,
      passwordHash: 'test-hash',
    };
    const repository = {
      findUserByEmail: jest.fn().mockResolvedValue(user),
      findTenantById: jest.fn().mockResolvedValue({ status: 'ACTIVE' }),
      updateLastLoginAt: jest.fn(),
    };
    const jwt = { sign: jest.fn().mockReturnValue('local-token') };
    jest.mocked(verifyPassword).mockResolvedValue(true);
    return {
      service: new AuthService(repository as never, jwt as never),
      repository,
      jwt,
    };
  };
  it.each(['realdata', 'development', 'production'])(
    'login in %s preserves its intended write behavior',
    async (mode) => {
      process.env.VALORAR_DATABASE_ENV = mode;
      const h = setup();
      const result = await h.service.login({
        email: 'test@example.test',
        password: 'test',
      });
      expect(result.token).toBe('local-token');
      expect(verifyPassword).toHaveBeenCalledWith('test', 'test-hash');
      expect(h.repository.findTenantById).toHaveBeenCalledWith('t');
      expect(h.repository.updateLastLoginAt).toHaveBeenCalledTimes(
        mode === 'realdata' ? 0 : 1,
      );
    },
  );
  it('does not bypass passwords in RealData', async () => {
    process.env.VALORAR_DATABASE_ENV = 'realdata';
    const h = setup();
    jest.mocked(verifyPassword).mockResolvedValue(false);
    await expect(
      h.service.login({ email: 'test@example.test', password: 'wrong' }),
    ).rejects.toThrow();
    expect(h.jwt.sign).not.toHaveBeenCalled();
    expect(h.repository.updateLastLoginAt).not.toHaveBeenCalled();
  });
});
