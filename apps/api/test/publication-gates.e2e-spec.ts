import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { PUBLICATION_CHECKLIST_INCOMPLETE } from '@repo/property-rules';
import { AppModule } from '../src/app.module';

describe('Publication gates (e2e)', () => {
  let app: INestApplication<App>;
  let authCookie: string[];
  let tenantId: string;
  let propertyId: string;
  let listingId: string;

  beforeAll(async () => {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ?? 'valorar-dev-jwt-secret-min-32-chars!!';
    process.env.COOKIE_SECURE = 'false';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@demo.valorar.dev',
        password: 'ValorarDev2026!',
      })
      .expect(200);

    authCookie = login.headers['set-cookie'] ?? [];
    tenantId = login.body.tenantId as string;

    const properties = await request(app.getHttpServer())
      .get('/properties')
      .set('Cookie', authCookie)
      .set('X-Tenant-Id', tenantId)
      .expect(200);

    propertyId = properties.body[0]?.id;
    expect(propertyId).toBeDefined();

    const listings = await request(app.getHttpServer())
      .get(`/property-listings?propertyId=${propertyId}`)
      .set('Cookie', authCookie)
      .set('X-Tenant-Id', tenantId)
      .expect(200);

    listingId =
      listings.body.find((item: { status: string }) => item.status === 'DRAFT')
        ?.id ?? listings.body[0]?.id;
    expect(listingId).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /properties/:id/publishability returns checklist contract', async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/properties/${propertyId}/publishability?listingId=${listingId}`,
      )
      .set('Cookie', authCookie)
      .set('X-Tenant-Id', tenantId)
      .expect(200);

    expect(response.body).toMatchObject({
      isPublishable: expect.any(Boolean),
      progress: expect.any(Number),
      checks: expect.any(Array),
      missing: expect.any(Array),
    });

    expect(response.body.checks.length).toBeGreaterThan(0);
    expect(response.body.checks[0]).toMatchObject({
      key: expect.any(String),
      passed: expect.any(Boolean),
      label: expect.any(String),
    });
  });

  it('PATCH listing → ACTIVE fails with PUBLICATION_CHECKLIST_INCOMPLETE when incomplete', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/property-listings/${listingId}`)
      .set('Cookie', authCookie)
      .set('X-Tenant-Id', tenantId)
      .send({ status: 'ACTIVE' })
      .expect(400);

    expect(response.body.code).toBe(PUBLICATION_CHECKLIST_INCOMPLETE);
    expect(Array.isArray(response.body.missing)).toBe(true);
    expect(response.body.missing.length).toBeGreaterThan(0);
  });
});
