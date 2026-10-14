import 'reflect-metadata';
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '../generated/prisma/client';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UserModule } from '../src/modules/user/user.module';
import { AuthService } from '../src/modules/auth/auth.service';
import { PasswordChangeRepository } from '../src/modules/user/password/password-change.repository';
import { PasswordChangeService } from '../src/modules/user/password/password-change.service';
import {
  hashPassword,
  verifyPassword,
} from '../src/modules/auth/utils/password.util';

function responseBody(response: { body: unknown }): {
  code?: string;
  retryAfterSeconds: number;
  id?: string;
} {
  return response.body as {
    code?: string;
    retryAfterSeconds: number;
    id?: string;
  };
}

describe('B2 — isolated PostgreSQL, bcrypt, JWT and HTTP guards', () => {
  const prefix = `b2-${randomUUID()}`;
  const tenantId = `${prefix}-tenant`;
  const otherTenantId = `${prefix}-other`;
  const oldPassword = 'legacy8!';
  const newPassword = '  nueva clave segura  ';
  const applicationLogs: unknown[][] = [];
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 8,
    connectionTimeoutMillis: 5000,
  });
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let auth: AuthService;
  let repository: PasswordChangeRepository;
  let service: PasswordChangeService;
  let oldHash: string;
  let verified = false;
  const users: Record<
    string,
    { id: string; cookie: string; secondCookie: string }
  > = {};

  beforeAll(async () => {
    const { rows } = await pool.query<{
      project: string;
      branch: string;
      endpoint: string;
    }>(`
      SELECT current_setting('neon.project_id') AS project,
        current_setting('neon.branch_id') AS branch, current_setting('neon.endpoint_id') AS endpoint
    `);
    expect(rows[0].project).toBe('square-lab-71259415');
    expect(rows[0].branch).toBe(process.env.PASSWORD_CHANGE_TEST_BRANCH_ID);
    expect(rows[0].endpoint).toBe(
      new URL(process.env.DATABASE_URL!).hostname
        .split('.')[0]
        .replace(/-pooler$/, ''),
    );
    expect(rows[0].endpoint).not.toBe('ep-mute-sun-ac6nva0v');
    expect(rows[0].endpoint).not.toBe('ep-orange-resonance-acqkorp6');
    verified = true;

    const module = await Test.createTestingModule({
      imports: [PrismaModule, UserModule],
    }).compile();
    app = module.createNestApplication<INestApplication<App>>({
      logger: {
        log: (...args: unknown[]) => {
          applicationLogs.push(args);
        },
        warn: (...args: unknown[]) => {
          applicationLogs.push(args);
        },
        error: (...args: unknown[]) => {
          applicationLogs.push(args);
        },
      },
    });
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    auth = app.get(AuthService);
    repository = app.get(PasswordChangeRepository);
    service = app.get(PasswordChangeService);
    oldHash = await hashPassword(oldPassword);
    await prisma.tenant.createMany({
      data: [tenantId, otherTenantId].map((id) => ({ id, name: id, slug: id })),
    });
    for (const role of Object.values(UserRole)) {
      const user = await prisma.user.create({
        data: {
          id: `${prefix}-${role}`,
          tenantId: role === UserRole.SUPER_ADMIN ? null : tenantId,
          firstName: 'B2',
          lastName: role,
          name: `B2 ${role}`,
          email: `${prefix}-${role}@example.invalid`,
          role,
          passwordHash: oldHash,
        },
      });
      const identity = auth.toAuthenticatedUser(user);
      const jwt = auth.signToken(identity);
      users[role] = {
        id: user.id,
        cookie: `access_token=${jwt}`,
        secondCookie: `access_token=${app.get(JwtService).sign({ sub: user.id, jti: randomUUID() })}`,
      };
    }
  });

  beforeEach(async () => {
    if (!prisma) return;
    const ids = Object.values(users).map((u) => u.id);
    await prisma.passwordChangeRateLimit.deleteMany({
      where: { userId: { in: ids } },
    });
    await prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { passwordHash: oldHash, isActive: true },
    });
  });

  afterAll(async () => {
    if (verified && prisma) {
      await prisma.user.deleteMany({
        where: { email: { startsWith: prefix } },
      });
      await prisma.tenant.deleteMany({
        where: { id: { in: [tenantId, otherTenantId] } },
      });
    }
    if (app) await app.close();
    await pool.end();
  });

  const change = (
    role: UserRole = UserRole.AGENT,
    body: unknown = { currentPassword: oldPassword, newPassword },
  ) =>
    request(app.getHttpServer())
      .patch('/users/me/password')
      .set('Cookie', users[role].cookie)
      .send(body as object);

  it('has the additive migration checksum and bounded array constraint', async () => {
    const migration = '202610130001_password_change_rate_limit';
    const checksum = createHash('sha256')
      .update(
        readFileSync(
          resolve(__dirname, `../prisma/migrations/${migration}/migration.sql`),
        ),
      )
      .digest('hex');
    const { rows } = await pool.query<{ checksum: string }>(
      'SELECT checksum FROM "_prisma_migrations" WHERE migration_name = $1 AND finished_at IS NOT NULL',
      [migration],
    );
    expect(rows).toEqual([{ checksum }]);
    await expect(
      pool.query(
        `INSERT INTO "PasswordChangeRateLimit" ("userId", "attemptedAt", "expiresAt")
      VALUES ($1, array_fill(clock_timestamp(), ARRAY[6]), clock_timestamp())`,
        [users.AGENT.id],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it.each(Object.values(UserRole))(
    'changes password for %s, retaining existing JWTs and cookie expiry',
    async (role) => {
      const response = await change(role).expect(204);
      expect(response.headers['set-cookie']).toBeUndefined();
      expect(response.headers['cache-control']).toBe('no-store');
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: users[role].id },
      });
      expect(await verifyPassword(newPassword, user.passwordHash)).toBe(true);
      expect(await verifyPassword(oldPassword, user.passwordHash)).toBe(false);
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', users[role].cookie)
        .expect(200);
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', users[role].secondCookie)
        .expect(200);
      expect(
        (
          await prisma.passwordChangeRateLimit.findUniqueOrThrow({
            where: { userId: user.id },
          })
        ).attemptedAt,
      ).toHaveLength(1);
    },
  );

  it('rejects the current password without writes to credentials; legacy login still works', async () => {
    const response = await change(UserRole.AGENT, {
      currentPassword: 'wrong',
      newPassword,
    }).expect(400);
    expect(response.body).toMatchObject({
      statusCode: 400,
      code: 'CURRENT_PASSWORD_INVALID',
      field: 'currentPassword',
    });
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: users.AGENT.id },
    });
    expect(user.passwordHash).toBe(oldHash);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: oldPassword })
      .expect(200);
  });

  it.each(['short', 'a'.repeat(73), '😀'.repeat(19), ' '.repeat(12)])(
    'rejects policy violations and consumes the admission',
    async (password) => {
      const response = await change(UserRole.AGENT, {
        currentPassword: oldPassword,
        newPassword: password,
      }).expect(422);
      expect(responseBody(response).code).toBe('PASSWORD_POLICY_VIOLATION');
      expect(
        (
          await prisma.passwordChangeRateLimit.findUniqueOrThrow({
            where: { userId: users.AGENT.id },
          })
        ).attemptedAt,
      ).toHaveLength(1);
    },
  );

  it('accepts UTF-8 at 72 bytes and rejects bcrypt-equivalent reuse', async () => {
    const password = '😀'.repeat(18);
    await change(UserRole.AGENT, {
      currentPassword: oldPassword,
      newPassword: password,
    }).expect(204);
    const response = await change(UserRole.AGENT, {
      currentPassword: password,
      newPassword: password,
    }).expect(422);
    expect(responseBody(response).code).toBe('PASSWORD_REUSED');
  });

  it('preserves legacy passwords longer than 72 bytes but rejects equivalent reuse', async () => {
    const legacy = 'a'.repeat(72) + 'legacy suffix';
    await prisma.user.update({
      where: { id: users.AGENT.id },
      data: { passwordHash: await hashPassword(legacy) },
    });
    const response = await change(UserRole.AGENT, {
      currentPassword: legacy,
      newPassword: 'a'.repeat(72),
    }).expect(422);
    expect(responseBody(response).code).toBe('PASSWORD_REUSED');
    await change(UserRole.AGENT, {
      currentPassword: legacy,
      newPassword,
    }).expect(204);
  });

  it('counts DTO failures and successes together; sixth is 429 without extending the window', async () => {
    await change().expect(204);
    for (let i = 0; i < 4; i++) {
      const response = await change(UserRole.AGENT, {
        currentPassword: newPassword,
        newPassword,
        userId: 'other',
      }).expect(400);
      expect(responseBody(response).code).toBe('INVALID_REQUEST');
    }
    const before = await prisma.passwordChangeRateLimit.findUniqueOrThrow({
      where: { userId: users.AGENT.id },
    });
    const response = await change().expect(429);
    expect(response.body).toMatchObject({
      statusCode: 429,
      code: 'PASSWORD_CHANGE_RATE_LIMITED',
      retryAfterSeconds: expect.any(Number) as unknown,
    });
    expect(response.headers['retry-after']).toBe(
      String(responseBody(response).retryAfterSeconds),
    );
    expect(responseBody(response).retryAfterSeconds).toBeGreaterThan(0);
    expect(responseBody(response).retryAfterSeconds).toBeLessThanOrEqual(900);
    expect(
      await prisma.passwordChangeRateLimit.findUniqueOrThrow({
        where: { userId: users.AGENT.id },
      }),
    ).toEqual(before);
  });

  it('uses a rolling window and expires old attempts rather than resetting a fixed bucket', async () => {
    await repository.consume(users.AGENT.id);
    await pool.query(
      `UPDATE "PasswordChangeRateLimit" SET "attemptedAt" = ARRAY[
      clock_timestamp() - interval '16 minutes', clock_timestamp() - interval '14 minutes',
      clock_timestamp() - interval '13 minutes', clock_timestamp() - interval '12 minutes',
      clock_timestamp() - interval '11 minutes'], "expiresAt" = clock_timestamp() + interval '4 minutes'
      WHERE "userId" = $1`,
      [users.AGENT.id],
    );
    expect(await repository.consume(users.AGENT.id)).toEqual({ allowed: true });
    const denied = await repository.consume(users.AGENT.id);
    expect(denied).toMatchObject({
      allowed: false,
      retryAfterSeconds: expect.any(Number) as unknown,
    });
    if (!denied.allowed)
      expect(denied.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it('expires attempts at the 15-minute boundary and releases all five slots', async () => {
    await repository.consume(users.AGENT.id);
    await pool.query(
      `UPDATE "PasswordChangeRateLimit" SET
      "attemptedAt" = array_fill(clock_timestamp() - interval '15 minutes', ARRAY[5]),
      "expiresAt" = clock_timestamp() WHERE "userId" = $1`,
      [users.AGENT.id],
    );
    for (let i = 0; i < 5; i++)
      expect(await repository.consume(users.AGENT.id)).toEqual({
        allowed: true,
      });
    expect(await repository.consume(users.AGENT.id)).toMatchObject({
      allowed: false,
    });
  });

  it('serializes first-row creation across independent clients and persists across client restart', async () => {
    const otherPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    });
    const otherClient = new PrismaClient({ adapter: new PrismaPg(otherPool) });
    const other = new PasswordChangeRepository(otherClient as PrismaService);
    try {
      const results = await Promise.all(
        Array.from({ length: 12 }, (_, i) =>
          (i % 2 ? other : repository).consume(users.AGENT.id),
        ),
      );
      expect(results.filter((r) => r.allowed)).toHaveLength(5);
      expect(results.filter((r) => !r.allowed)).toHaveLength(7);
    } finally {
      await otherClient.$disconnect();
      await otherPool.end();
    }
    const restartedPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const restarted = new PrismaClient({
      adapter: new PrismaPg(restartedPool),
    });
    try {
      expect(
        await new PasswordChangeRepository(restarted as PrismaService).consume(
          users.AGENT.id,
        ),
      ).toMatchObject({ allowed: false });
    } finally {
      await restarted.$disconnect();
      await restartedPool.end();
    }
  });

  it('fails closed on a real PostgreSQL row-lock timeout without touching credentials', async () => {
    await repository.consume(users.AGENT.id);
    const blocker = await pool.connect();
    try {
      await blocker.query('BEGIN');
      await blocker.query(
        'SELECT "userId" FROM "PasswordChangeRateLimit" WHERE "userId" = $1 FOR UPDATE',
        [users.AGENT.id],
      );
      const response = await change().expect(503);
      expect(responseBody(response).code).toBe('PASSWORD_CHANGE_UNAVAILABLE');
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: users.AGENT.id } }))
          .passwordHash,
      ).toBe(oldHash);
    } finally {
      await blocker.query('ROLLBACK');
      blocker.release();
    }
    expect(
      (
        await prisma.passwordChangeRateLimit.findUniqueOrThrow({
          where: { userId: users.AGENT.id },
        })
      ).attemptedAt,
    ).toHaveLength(1);
  });

  it('fails closed when the PostgreSQL driver is disconnected', async () => {
    const disconnectedPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = new PrismaClient({
      adapter: new PrismaPg(disconnectedPool),
    });
    const disconnected = new PasswordChangeService(
      new PasswordChangeRepository(client as PrismaService),
    );
    await disconnectedPool.end();
    try {
      await expect(disconnected.consume(users.AGENT.id)).rejects.toMatchObject({
        response: { code: 'PASSWORD_CHANGE_UNAVAILABLE', statusCode: 503 },
      });
    } finally {
      await client.$disconnect();
    }
  });

  it('keeps admission committed when a credential transaction rolls back', async () => {
    const replace = jest
      .spyOn(repository, 'replacePassword')
      .mockImplementation(async (userId, previousHash, passwordHash) => {
        return prisma.$transaction(async (tx) => {
          await tx.user.updateMany({
            where: { id: userId, passwordHash: previousHash },
            data: { passwordHash },
          });
          throw new Error('Injected rollback');
        });
      });
    try {
      await change().expect(503);
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: users.AGENT.id } }))
          .passwordHash,
      ).toBe(oldHash);
      expect(
        (
          await prisma.passwordChangeRateLimit.findUniqueOrThrow({
            where: { userId: users.AGENT.id },
          })
        ).attemptedAt,
      ).toHaveLength(1);
    } finally {
      replace.mockRestore();
    }
  });

  it('allows only one CAS replacement when two changes verified the same hash', async () => {
    const original = repository.credentials.bind(repository) as (
      id: string,
    ) => ReturnType<PasswordChangeRepository['credentials']>;
    let reads = 0;
    let release!: () => void;
    const barrier = new Promise<void>((resolveBarrier) => {
      release = resolveBarrier;
    });
    const spy = jest
      .spyOn(repository, 'credentials')
      .mockImplementation(async (id) => {
        const credentials = await original(id);
        reads++;
        if (reads === 2) release();
        await barrier;
        return credentials;
      });
    try {
      const results = await Promise.all([
        change(),
        change(UserRole.AGENT, {
          currentPassword: oldPassword,
          newPassword: 'second new password',
        }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([204, 409]);
      expect(responseBody(results.find((r) => r.status === 409)!).code).toBe(
        'CREDENTIALS_CHANGED',
      );
      expect(
        (
          await prisma.passwordChangeRateLimit.findUniqueOrThrow({
            where: { userId: users.AGENT.id },
          })
        ).attemptedAt,
      ).toHaveLength(2);
    } finally {
      spy.mockRestore();
    }
  });

  it('does not permit profile or self-admin bypass, even with isActive=false', async () => {
    const user = users.TENANT_ADMIN;
    await request(app.getHttpServer())
      .patch('/users/me/profile')
      .set('Cookie', user.cookie)
      .send({ password: newPassword })
      .expect(400);
    for (const extra of [{}, { isActive: false }]) {
      const response = await request(app.getHttpServer())
        .patch(`/users/${user.id}`)
        .set('Cookie', user.cookie)
        .send({ password: newPassword, ...extra })
        .expect(400);
      expect(responseBody(response).code).toBe(
        'PASSWORD_CHANGE_ENDPOINT_REQUIRED',
      );
    }
    const current = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(current.passwordHash).toBe(oldHash);
    expect(current.isActive).toBe(true);
    await request(app.getHttpServer())
      .patch('/users/me/profile')
      .set('Cookie', user.cookie)
      .send({ firstName: 'Updated' })
      .expect(200);
  });

  it('preserves admin reset permissions and enforces new policy in reset and creation', async () => {
    const admin = users.TENANT_ADMIN;
    await request(app.getHttpServer())
      .patch(`/users/${users.AGENT.id}`)
      .set('Cookie', admin.cookie)
      .send({ password: 'short' })
      .expect(422);
    await request(app.getHttpServer())
      .patch(`/users/${users.AGENT.id}`)
      .set('Cookie', admin.cookie)
      .send({ password: newPassword })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/users/${admin.id}`)
      .set('Cookie', users.AGENT.cookie)
      .send({ password: newPassword })
      .expect(403);
    await request(app.getHttpServer())
      .post('/users')
      .set('Cookie', admin.cookie)
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: `${prefix}-created@example.invalid`,
        role: 'AGENT',
        password: 'short',
      })
      .expect(422);
    const created = await request(app.getHttpServer())
      .post('/users')
      .set('Cookie', admin.cookie)
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: `${prefix}-created@example.invalid`,
        role: 'AGENT',
        password: newPassword,
      })
      .expect(201);
    // Created through API: clean up its generated ID explicitly.
    await prisma.user.delete({
      where: { id: String(responseBody(created).id) },
    });
  });

  it('isolates tenants and keys cupos by identity, not X-Tenant-Id', async () => {
    const other = await prisma.user.create({
      data: {
        id: `${prefix}-foreign`,
        tenantId: otherTenantId,
        firstName: 'Other',
        lastName: 'User',
        name: 'Other',
        email: `${prefix}-foreign@example.invalid`,
        passwordHash: oldHash,
      },
    });
    await request(app.getHttpServer())
      .patch(`/users/${other.id}`)
      .set('Cookie', users.TENANT_ADMIN.cookie)
      .send({ password: newPassword })
      .expect(404);
    for (let i = 0; i < 5; i++) {
      await change(UserRole.SUPER_ADMIN, {
        currentPassword: 'wrong',
        newPassword,
      })
        .set('X-Tenant-Id', i % 2 ? tenantId : otherTenantId)
        .expect(400);
    }
    await request(app.getHttpServer())
      .patch('/users/me/password')
      .set('Cookie', users.SUPER_ADMIN.secondCookie)
      .send({ currentPassword: oldPassword, newPassword })
      .expect(429);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: other.id } }))
        .passwordHash,
    ).toBe(oldHash);
    await change(UserRole.AGENT).expect(204);
  });

  it('rejects missing/invalid JWT, inactive users, suspended tenant and foreign Origin', async () => {
    await request(app.getHttpServer())
      .patch('/users/me/password')
      .send({ currentPassword: oldPassword, newPassword })
      .expect(401);
    await request(app.getHttpServer())
      .patch('/users/me/password')
      .set('Cookie', 'access_token=invalid')
      .send({ currentPassword: oldPassword, newPassword })
      .expect(401);
    await change().set('Origin', 'https://untrusted.example').expect(403);
    await prisma.user.update({
      where: { id: users.AGENT.id },
      data: { isActive: false },
    });
    await change().expect(401);
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'SUSPENDED' },
    });
    try {
      await change(UserRole.TENANT_ADMIN).expect(401);
    } finally {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { status: 'ACTIVE' },
      });
    }
    expect(
      await prisma.passwordChangeRateLimit.count({
        where: { userId: users.AGENT.id },
      }),
    ).toBe(0);
  });

  it('sanitizes DB failure responses and emits no credential logs', async () => {
    const error = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const consume = jest
      .spyOn(repository, 'consume')
      .mockRejectedValue(new Error(`SECRET_SENTINEL ${oldHash}`));
    const handler = jest.spyOn(service, 'change');
    try {
      const response = await change().expect(503);
      expect(JSON.stringify(response.body)).not.toContain('SECRET_SENTINEL');
      expect(JSON.stringify(response.body)).not.toContain(oldHash);
      expect(handler).not.toHaveBeenCalled();
      for (const secret of [
        'SECRET_SENTINEL',
        oldPassword,
        newPassword,
        oldHash,
        users.AGENT.cookie,
      ]) {
        expect(JSON.stringify(applicationLogs)).not.toContain(secret);
      }
      expect(error).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
      log.mockRestore();
      warn.mockRestore();
      consume.mockRestore();
      handler.mockRestore();
    }
  });
});
