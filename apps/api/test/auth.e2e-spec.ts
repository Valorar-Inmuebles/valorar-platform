import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('AuthModule (e2e)', () => {
  let app: INestApplication<App>;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/login sets cookie and returns user', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@demo.valorar.dev',
        password: 'ValorarDev2026!',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      email: 'admin@demo.valorar.dev',
      role: 'TENANT_ADMIN',
    });
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('access_token=')]),
    );
  });

  it('GET /auth/me returns profile with session cookie', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@demo.valorar.dev',
        password: 'ValorarDev2026!',
      })
      .expect(200);

    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', login.headers['set-cookie'] ?? [])
      .expect(200);

    expect(me.body.email).toBe('admin@demo.valorar.dev');
  });

  it('POST /auth/logout clears session', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@demo.valorar.dev',
        password: 'ValorarDev2026!',
      })
      .expect(200);

    await request(app.getHttpServer()).post('/auth/logout').expect(204);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', login.headers['set-cookie'] ?? [])
      .expect(401);
  });
});
