import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * E2E = real HTTP requests against a booted Nest app (and your Postgres DB).
 * Needs DATABASE_URL + JWT secrets in backend/.env (same as local run).
 */
describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // Unique email so re-runs do not clash with leftover rows
  const email = `e2e-auth-${Date.now()}@example.com`;
  const password = 'password123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Match main.ts so DTOs validate the same way as production
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Clean up the user we created (and any related rows if needed later)
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('registers and logs in with tokens', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        access_token: expect.any(String) as string,
        refresh_token: expect.any(String) as string,
      }),
    );
  });

  it('returns 401 for a protected route without a token', async () => {
    await request(app.getHttpServer()).get('/users/profile').expect(401);
  });

  it('returns 401 for the same access token after logout', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const loginBody = login.body as {
      access_token: string;
      refresh_token: string;
    };
    const token = loginBody.access_token;

    // Still logged in — profile works
    await request(app.getHttpServer())
      .get('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Session revoked — same JWT must no longer work
    await request(app.getHttpServer())
      .get('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('rotates tokens on refresh and rejects the old refresh token', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const loginBody = login.body as {
      access_token: string;
      refresh_token: string;
    };
    const oldRefresh = loginBody.refresh_token;

    const refreshed = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(200);

    const refreshedBody = refreshed.body as {
      access_token: string;
      refresh_token: string;
    };
    expect(refreshedBody).toEqual(
      expect.objectContaining({
        access_token: expect.any(String) as string,
        refresh_token: expect.any(String) as string,
      }),
    );

    await request(app.getHttpServer())
      .get('/users/profile')
      .set('Authorization', `Bearer ${refreshedBody.access_token}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(401);
  });

  it('returns 401 for an invalid refresh token', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'not-a-jwt' })
      .expect(401);
  });
});
