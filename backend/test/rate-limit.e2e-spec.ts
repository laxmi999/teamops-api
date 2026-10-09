import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2eApp } from './e2e-app';

describe('Rate limiting (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const password = 'password123';
  const mainEmail = `e2e-rl-main-${stamp}@example.com`;
  // Common prefix of every email this spec creates (main + numbered users).
  const emailPrefix = 'e2e-rl-';

  let token: string;

  beforeAll(async () => {
    app = await createE2eApp();
    prisma = app.get(PrismaService);

    // One register + one login here: consumes 1 of the 5/min login budget.
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: mainEmail, password })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: mainEmail, password })
      .expect(200);

    token = (login.body as { access_token: string }).access_token;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { startsWith: emailPrefix } },
    });
    await app.close();
  });

  it('returns 401 for wrong passwords, then 429 once the login limit is hit', async () => {
    const wrong = { email: mainEmail, password: 'wrong-password' };

    // 4 more failures on top of the beforeAll login = 5 in the window.
    for (let i = 0; i < 4; i++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send(wrong)
        .expect(401);
    }

    // 6th attempt within the window — even with correct credentials.
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: mainEmail, password })
      .expect(429);
  });

  it('does not affect non-auth endpoints (per-route scope)', async () => {
    await request(app.getHttpServer())
      .get('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/teams')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('caps mass registration at 5 per hour', async () => {
    // mainEmail was register #1; four more reach the limit of 5.
    for (let i = 2; i <= 5; i++) {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: `e2e-rl-user-${stamp}-${i}@example.com`, password })
        .expect(201);
    }

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `e2e-rl-user-${stamp}-6@example.com`, password })
      .expect(429);
  });
});
